using System.Collections.Concurrent;
using System.Text.Json;
using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Application.Plugins;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace Booking.Application.Services;

/// <summary>
/// Drives the SK agent. Key design: the LLM always returns structured JSON
/// { reply, roomIds[], reservationIds[] } so it explicitly chooses which cards
/// to surface. The backend then filters plugin data to exactly those IDs.
///
/// This eliminates "last plugin ran" leakage where internal tool calls
/// (e.g. GetAvailableRooms called during a booking flow) accidentally
/// surfaced as recommendation cards.
/// </summary>
public sealed class ChatService(
    Kernel kernel,
    RoomPlugin roomPlugin,
    ReservationPlugin reservationPlugin,
    ILogger<ChatService> logger) : IChatService
{
    private static readonly ConcurrentDictionary<string, ChatHistory> _sessions = new();
    private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web);
    private const int MaxSessions = 500;

    private const string SystemPrompt =
        """
        You are a helpful AI concierge for the Booking System - a room reservation platform.

        -- TOOLS --
        - GetAvailableRooms : use when the user specifies a time window (and optional capacity).
          Always prefer this over separate ListRooms + CheckAvailability calls.
        - ListRooms         : use when the user wants to browse rooms with no time constraint.
        - GetMyReservations : use when the user asks about their own upcoming bookings.
        - CreateReservation : use to book a room. ALWAYS confirm room name, date, and time
          with the user FIRST. Never book without explicit confirmation.
        - CancelReservation : use to cancel an existing booking. You MUST fetch their reservations first to find the correct ID. 
          If they have multiple reservations matching their request, list them and ask which one to cancel. 
          ALWAYS explicitly confirm the room and time before executing the cancellation.
        - CheckAvailability : use only when you need to check a window without capacity filtering.

        Never invent room names, capacities, or availability - always use the tools.

        -- RESPONSE FORMAT (REQUIRED) --
        You MUST respond with valid JSON matching this exact schema - no markdown, no extra text:

        {
          "reply": "Your conversational response to the user (plain text, no JSON inside).",
          "roomIds": ["uuid-1", "uuid-2"],
          "reservationIds": ["uuid-3"]
        }

        Rules for roomIds:
        - Include ONLY the IDs of rooms you want the UI to render as interactive booking cards.
        - Be selective: if the user asked for rooms with exactly N seats, only include rooms
          whose capacity matches. Do not include every room the tool returned.
        - Leave empty ([]) when rooms were fetched internally (e.g. to confirm availability
          before booking) - the user does not need to see a card list in that case.
        - Leave empty after CreateReservation succeeds (the booking is done, no card needed).

        Rules for reservationIds:
        - Include IDs only when the user explicitly asked to view/manage their reservations.
        - Leave empty ([]) for all other queries.

        Both arrays MUST be present even when empty. 

        TIMEZONE INSTRUCTIONS:
        - The server time is currently {NOW} (UTC).
        - Assume the user is in UTC+7 (Indochina Time) unless they specify otherwise.
        - When the user asks to book a room at "9am", they mean 9:00 AM UTC+7. 
        - You MUST convert their local time to UTC before passing DateTimes to the tool parameters.
        - When responding to the user in text, display times in their local timezone (UTC+7).
        """;

    public async Task<ChatResult> ChatAsync(
        string sessionId, string message, Guid userId, CancellationToken ct = default)
    {
        var history = _sessions.GetOrAdd(sessionId, CreateHistory);
        history.AddUserMessage(message);

        var chat = kernel.GetRequiredService<IChatCompletionService>();

#pragma warning disable SKEXP0001
        var settings = new OpenAIPromptExecutionSettings
        {
            FunctionChoiceBehavior = FunctionChoiceBehavior.Auto(),
            ResponseFormat = "json_object"   // LLM guaranteed to output valid JSON
        };
#pragma warning restore SKEXP0001

        try
        {
            reservationPlugin.SetCurrentUserId(userId);

            var reply = await chat.GetChatMessageContentAsync(history, settings, kernel, ct);
            history.Add(reply);

            // Parse the structured JSON the model was instructed to return.
            var structured = ParseStructuredResponse(reply.Content);

            // Resolve room cards: filter the plugin's fetched set to only model-chosen IDs.
            var roomIds = structured.RoomIds.ToHashSet(StringComparer.OrdinalIgnoreCase);
            var rooms = roomPlugin.LastQueryResult?.Rooms
                .Where(r => roomIds.Contains(r.Id.ToString("D")))
                .ToList();

            // Get slot times from the plugin result (set during GetAvailableRooms call).
            var slotSource = roomPlugin.LastQueryResult;

            // Resolve reservation cards: same ID-based filtering.
            var resIds = structured.ReservationIds.ToHashSet(StringComparer.OrdinalIgnoreCase);
            var reservations = reservationPlugin.LastQueryResult?.Reservations
                .Where(r => resIds.Contains(r.Id.ToString("D")))
                .ToList();

            return new ChatResult(
                structured.Reply,
                rooms?.Count > 0 ? rooms : null,
                rooms?.Count > 0 ? slotSource?.SlotStart : null,
                rooms?.Count > 0 ? slotSource?.SlotEnd : null,
                reservations?.Count > 0 ? reservations : null);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or OperationCanceledException)
        {
            if (history.Count > 0) history.RemoveAt(history.Count - 1);
            logger.LogWarning(ex, "OpenAI unavailable - falling back for session {SessionId}", sessionId);
            return await DirectPluginFallbackAsync(message, ct);
        }
    }

    private static AssistantStructuredResponse ParseStructuredResponse(string? content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return new AssistantStructuredResponse { Reply = "I could not generate a response. Please try again." };

        try
        {
            var result = JsonSerializer.Deserialize<AssistantStructuredResponse>(content, _jsonOptions);
            if (result is not null && !string.IsNullOrWhiteSpace(result.Reply))
                return result;
        }
        catch (JsonException ex)
        {
            // Model didn't follow the JSON format - treat the whole content as the reply text.
            // Log so we can tune the prompt if this happens often.
            _ = ex; // suppress unused warning
        }

        // Fallback: wrap raw content as the reply with no cards.
        return new AssistantStructuredResponse { Reply = content };
    }

    private async Task<ChatResult> DirectPluginFallbackAsync(string message, CancellationToken ct)
    {
        const string Preamble = "The AI service is temporarily unavailable. Here is what I can show you directly:";
        var lower = message.ToLowerInvariant();

        try
        {
            if (lower.Contains("reservation") || lower.Contains("my booking") || lower.Contains("upcoming"))
            {
                var result = await reservationPlugin.GetMyReservationsAsync(ct);
                var ids = result.Reservations.Select(r => r.Id.ToString("D")).ToList();
                return new ChatResult(Preamble, null, null, null, result.Reservations);
            }

            if (lower.Contains("room") || lower.Contains("available") || lower.Contains("space"))
            {
                var result = await roomPlugin.ListRoomsAsync(0, ct);
                return new ChatResult(Preamble, result.Rooms, null, null);
            }

            return new ChatResult(
                "The AI assistant is temporarily unavailable. " +
                "You can still browse rooms and manage reservations using the main interface.");
        }
        catch (Exception dbEx)
        {
            logger.LogError(dbEx, "DirectPluginFallback also failed for: {Message}", message);
            return new ChatResult(
                "The booking assistant is temporarily unavailable. Please try again in a few minutes.");
        }
    }

    private static ChatHistory CreateHistory(string _)
    {
        if (_sessions.Count >= MaxSessions)
        {
            var oldest = _sessions.Keys.FirstOrDefault();
            if (oldest is not null) _sessions.TryRemove(oldest, out ChatHistory? _);
        }

        var h = new ChatHistory();
        h.AddSystemMessage(SystemPrompt.Replace("{NOW}", DateTime.UtcNow.ToString("R")));
        return h;
    }
}
