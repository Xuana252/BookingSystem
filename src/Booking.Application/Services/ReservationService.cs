using System.Text.Json;
using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Booking.Domain.Events;
using Booking.Domain.Interfaces;

namespace Booking.Application.Services;

public class ReservationService(
    IReservationRepository reservations,
    IEventPublisher eventPublisher,
    IBookingRuleEngine ruleEngine,
    ICorrelationIdAccessor correlationIdAccessor,
    IRealtimeNotifier realtimeNotifier) : IReservationService
{
    public Task<IReadOnlyList<Reservation>> GetAllAsync(CancellationToken ct = default)
        => reservations.GetAllAsync(ct);

    public async Task<Reservation> CreateAsync(CreateReservationRequest request, Guid userId, CancellationToken ct = default)
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

        return reservation;
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
}
