using System.Text.Json;
using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Booking.Domain.Events;
using Booking.Domain.Interfaces;

namespace Booking.Application.Services;

public class ReservationService(IReservationRepository reservations, IEventPublisher eventPublisher) : IReservationService
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

        await reservations.AddAsync(reservation, ct);
        await reservations.SaveChangesAsync(ct);

        var envelope = new EventEnvelope
        {
            EventType = EventTypes.ReservationCreated,
            Source = "Booking.Api",
            Payload = JsonSerializer.Serialize(reservation)
        };
        await eventPublisher.PublishAsync(envelope, ct);

        return reservation;
    }
}
