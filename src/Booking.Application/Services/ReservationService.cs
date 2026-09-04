using System.Text.Json;
using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Booking.Domain.Events;
using Booking.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Booking.Application.Services;

public class ReservationService(
    IReservationRepository reservations,
    IUserRepository users,
    IEventPublisher eventPublisher,
    IBookingRuleEngine ruleEngine,
    ICorrelationIdAccessor correlationIdAccessor,
    IRealtimeNotifier realtimeNotifier,
    ILogger<ReservationService> logger) : IReservationService
{
    public async Task<IReadOnlyList<ReservationResponse>> GetAllAsync(CancellationToken ct = default)
    {
        var all = await reservations.GetAllAsync(ct);

        // One GetAllAsync for the whole list rather than a lookup per reservation — avoids N+1
        // against the Users table. Fine at this project's scale; would need revisiting (a batched
        // GetByIdsAsync, say) if the user table ever got large.
        var usernameById = (await users.GetAllAsync(ct)).ToDictionary(u => u.Id, u => u.Username);

        return all.Select(r => ToResponse(r, usernameById.GetValueOrDefault(r.UserId, "Unknown"))).ToList();
    }

    public async Task<ReservationResponse> CreateAsync(CreateReservationRequest request, Guid userId, CancellationToken ct = default)
    {
        if (!Reservation.IsValidTimeRange(request.StartTime, request.EndTime))
        {
            throw new ArgumentException("EndTime must be after StartTime.");
        }

        var reservation = new Reservation
        {
            RoomId = request.RoomId,
            UserId = userId,
            StartTime = request.StartTime,
            EndTime = request.EndTime
        };

        var existingForRoom = await reservations.GetByRoomIdAsync(request.RoomId, ct);
        ruleEngine.Validate(reservation, existingForRoom);

        await reservations.AddAsync(reservation, ct);
        await reservations.SaveChangesAsync(ct);

        var envelope = new EventEnvelope
        {
            EventType = EventTypes.ReservationCreated,
            Source = "Booking.Api",
            Payload = JsonSerializer.Serialize(reservation),
            CorrelationId = correlationIdAccessor.CorrelationId
        };
        _ = PublishInBackground(envelope);
        await realtimeNotifier.RoomAvailabilityChangedAsync(reservation.RoomId, ct);

        var user = await users.GetByIdAsync(userId, ct);
        return ToResponse(reservation, user?.Username ?? "Unknown");
    }

    public async Task CancelAsync(Guid reservationId, Guid userId, CancellationToken ct = default)
    {
        var reservation = await reservations.GetByIdAsync(reservationId, ct)
            ?? throw new KeyNotFoundException($"Reservation '{reservationId}' not found.");

        if (reservation.UserId != userId)
        {
            throw new UnauthorizedAccessException("You do not have permission to cancel this reservation.");
        }

        if (reservation.Status == ReservationStatus.Cancelled)
        {
            return;
        }

        reservation.Status = ReservationStatus.Cancelled;
        await reservations.SaveChangesAsync(ct);

        var envelope = new EventEnvelope
        {
            EventType = EventTypes.ReservationCancelled,
            Source = "Booking.Api",
            Payload = JsonSerializer.Serialize(reservation),
            CorrelationId = correlationIdAccessor.CorrelationId
        };
        _ = PublishInBackground(envelope);
        await realtimeNotifier.RoomAvailabilityChangedAsync(reservation.RoomId, ct);
    }

    // Deliberately not awaited by CreateAsync/CancelAsync — SnsEventPublisher's network call to
    // AWS has shown up to ~20s of latency on this environment, and there's currently no need for
    // the Api to know publishing succeeded (the Worker is the thing that actually cares about
    // these events, and it's a separate, independent process anyway). CancellationToken.None,
    // not the caller's ct, since that's tied to HttpContext.RequestAborted and would cancel this
    // the moment the response is sent, almost every time. The try/catch is load-bearing, not
    // optional — nothing awaits this Task, so an unhandled exception here becomes an unobserved
    // faulted Task instead of surfacing anywhere; logging is the only way to know it happened.
    // Trade-off, accepted deliberately: if the process crashes or PublishAsync itself throws
    // between the reservation's SaveChangesAsync and this completing, the event is silently
    // lost with no retry. An outbox (write the event in the same transaction as the
    // reservation, drain it via a Hangfire job like the reminder scan) would close that gap;
    // not implemented here as overkill for the current need.
    private async Task PublishInBackground(EventEnvelope envelope)
    {
        try
        {
            await eventPublisher.PublishAsync(envelope, CancellationToken.None);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to publish {EventType} in the background; event is lost.", envelope.EventType);
        }
    }

    private static ReservationResponse ToResponse(Reservation reservation, string username) => new(
        reservation.Id,
        reservation.RoomId,
        reservation.UserId,
        username,
        reservation.StartTime,
        reservation.EndTime,
        reservation.Status,
        reservation.CreatedAt);
}
