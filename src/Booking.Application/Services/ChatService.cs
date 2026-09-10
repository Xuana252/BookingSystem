using System.Collections.Concurrent;
using Booking.Application.Interfaces;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace Booking.Application.Services;

/// <summary>
/// Drives the Semantic Kernel agent. One <see cref="ChatHistory"/> is kept per session in memory
/// so the LLM maintains conversational context within a session without a database round-trip.
/// Sessions are identified by a client-generated UUID stored in the browser (localStorage / state).
/// </summary>
public sealed class ChatService(Kernel kernel) : IChatService
{
    // Static so all scoped instances within the same process share history.
    // Simple and sufficient for a single-node deployment; move to Redis if the app goes multi-node.
    private static readonly ConcurrentDictionary<string, ChatHistory> _sessions = new();

    // Cap the number of kept sessions to avoid unbounded memory growth.
    private const int MaxSessions = 500;

    private const string SystemPrompt =
        """
        You are a helpful AI concierge for the Booking System - a platform for reserving meeting rooms.
        Your job is to help users discover available rooms, understand current reservations, and
        answer questions about the system.

        Rules:
        - Always use the provided tools (ListRooms, ListReservations, CheckAvailability) to get live data
          rather than making up information.
        - When a user asks about available rooms for a time, call CheckAvailability and ListRooms together
          so you can report which specific rooms are free.
        - Keep responses concise and friendly.
        - Today UTC date and time: {NOW}.
        """;

    public async Task<string> ChatAsync(
        string sessionId, string message, Guid userId, CancellationToken ct = default)
    {
        var history = _sessions.GetOrAdd(sessionId, CreateHistory);

        history.AddUserMessage(message);

        var chat = kernel.GetRequiredService<IChatCompletionService>();

        // FunctionChoiceBehavior.Auto lets the model decide when to call tools.
#pragma warning disable SKEXP0001 // Experimental API - stable in SK 1.x for this usage
        var settings = new OpenAIPromptExecutionSettings
        {
            FunctionChoiceBehavior = FunctionChoiceBehavior.Auto()
        };
#pragma warning restore SKEXP0001

        var reply = await chat.GetChatMessageContentAsync(history, settings, kernel, ct);
        history.Add(reply);

        return reply.Content ?? "I am sorry, I could not generate a response. Please try again.";
    }

    private static ChatHistory CreateHistory(string key)
    {
        // Evict oldest session if at capacity (simple approximation - not strictly LRU)
        if (_sessions.Count >= MaxSessions)
        {
            var oldest = _sessions.Keys.FirstOrDefault();
            if (oldest is not null)
            {
                _sessions.TryRemove(oldest, out ChatHistory? _);
            }
        }

        var h = new ChatHistory();
        h.AddSystemMessage(SystemPrompt.Replace("{NOW}", DateTime.UtcNow.ToString("R")));
        _ = key; // suppress unused warning — key is the sessionId, used only by GetOrAdd's factory
        return h;
    }
}