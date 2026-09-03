using System.Text.Json;
using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Booking.Domain.Events;
using Booking.Domain.Interfaces;

namespace Booking.Application.Services;

public class ReservationService(
    IReservationRepository reservations,
    IUserRepository users,
    IEventPublisher eventPublisher,
    IBookingRuleEngine ruleEngine,
    ICorrelationIdAccessor correlationIdAccessor,
    IRealtimeNotifier realtimeNotifier) : IReservationService
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
        await eventPublisher.PublishAsync(envelope, ct);
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
        await eventPublisher.PublishAsync(envelope, ct);
        await realtimeNotifier.RoomAvailabilityChangedAsync(reservation.RoomId, ct);
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
