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
    IRoomRepository rooms,
    IReservationAttendeeRepository attendees,
    IEventPublisher eventPublisher,
    IBookingRuleEngine ruleEngine,
    ICorrelationIdAccessor correlationIdAccessor,
    IRealtimeNotifier realtimeNotifier,
    ILogger<ReservationService> logger,
    Booking.Domain.Interfaces.ISystemSettingsRepository systemSettings,
    TimeProvider? timeProvider = null) : IReservationService
{
    public async Task<IReadOnlyList<ReservationResponse>> GetAllAsync(CancellationToken ct = default)
    {
        var all = await reservations.GetAllAsync(ct);

        // One GetAllAsync for the whole list rather than a lookup per reservation - avoids N+1
        // against the Users table. Fine at this project's scale; would need revisiting (a batched
        // GetByIdsAsync, say) if the user table ever got large.
        var usernameById = (await users.GetAllAsync(ct)).ToDictionary(u => u.Id, u => u.Username);

        // Same reasoning as the username dictionary above - one bulk query across every returned
        // reservation's attendees, not one query per reservation.
        var attendeesByReservation = (await attendees.GetForReservationsAsync(all.Select(r => r.Id), ct))
            .GroupBy(a => a.ReservationId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<AttendeeSummary>)g
                    .Select(a => new AttendeeSummary(a.UserId, usernameById.GetValueOrDefault(a.UserId, "Unknown")))
                    .ToList());

        return all.Select(r => ToResponse(
            r, usernameById.GetValueOrDefault(r.UserId, "Unknown"),
            attendeesByReservation.GetValueOrDefault(r.Id, []))).ToList();
    }

    public async Task<ReservationResponse> CreateAsync(CreateReservationRequest request, Guid userId, CancellationToken ct = default)
    {
        if (!Reservation.IsValidTimeRange(request.StartTime, request.EndTime))
        {
            throw new ArgumentException("EndTime must be after StartTime.");
        }

        var settings = await systemSettings.GetSettingsAsync(ct);
        var now = (timeProvider ?? TimeProvider.System).GetUtcNow().UtcDateTime;
        if ((request.StartTime - now).TotalDays > settings.MaxBookingLeadTimeDays)
        {
            throw new ArgumentException($"Cannot book more than {settings.MaxBookingLeadTimeDays} days in advance.");
        }

        var room = await rooms.GetByIdAsync(request.RoomId, ct)
            ?? throw new KeyNotFoundException($"Room '{request.RoomId}' not found.");
        if (!room.IsActive)
        {
            throw new ArgumentException("This room is not currently available for booking.");
        }

        // The host isn't an "attendee" — silently drop their own id rather than erroring if it
        // shows up in the list; Distinct() guards against the same id being listed twice too.
        var attendeeIds = (request.AttendeeUserIds ?? []).Where(id => id != userId).Distinct().ToList();

        var attendeeUsers = new List<User>(attendeeIds.Count);
        foreach (var attendeeId in attendeeIds)
        {
            var attendeeUser = await users.GetByIdAsync(attendeeId, ct)
                ?? throw new ArgumentException($"Attendee '{attendeeId}' is not a valid user.");
            attendeeUsers.Add(attendeeUser);
        }

        var reservation = new Reservation
        {
            RoomId = request.RoomId,
            UserId = userId,
            StartTime = request.StartTime,
            EndTime = request.EndTime
        };

        var existingForRoom = await reservations.GetByRoomIdAsync(request.RoomId, ct);
        ruleEngine.Validate(reservation, existingForRoom, room.Capacity, attendeeIds.Count, settings);

        await reservations.AddAsync(reservation, ct);
        if (attendeeIds.Count > 0)
        {
            // Not its own SaveChangesAsync call — ReservationAttendeeRepository shares the same
            // scoped BookingDbContext as ReservationRepository underneath, so staging these here
            // and committing via reservations.SaveChangesAsync() below persists the reservation
            // and its attendees in one atomic transaction, same trick the outbox pattern would
            // use if this project had one.
            await attendees.AddRangeAsync(reservation.Id, attendeeIds, ct);
        }
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
        var attendeeSummaries = attendeeIds.Zip(attendeeUsers, (id, u) => new AttendeeSummary(id, u.Username)).ToList();
        return ToResponse(reservation, user?.Username ?? "Unknown", attendeeSummaries);
    }

    public async Task CancelAsync(Guid reservationId, Guid userId, CancellationToken ct = default)
    {
        var reservation = await reservations.GetByIdAsync(reservationId, ct)
            ?? throw new KeyNotFoundException($"Reservation '{reservationId}' not found.");

        if (reservation.UserId != userId)
        {
            throw new UnauthorizedAccessException("You do not have permission to cancel this reservation.");
        }

        await ExecuteCancelAsync(reservation, ct);
    }

    public async Task SystemCancelAsync(Guid reservationId, string reason, CancellationToken ct = default)
    {
        var reservation = await reservations.GetByIdAsync(reservationId, ct)
            ?? throw new KeyNotFoundException($"Reservation '{reservationId}' not found.");
            
        if (reservation.CheckedInAt.HasValue) return;

        logger.LogInformation("System canceling reservation {ReservationId}. Reason: {Reason}", reservationId, reason);
        await ExecuteCancelAsync(reservation, ct);
    }

    public async Task CheckInAsync(Guid reservationId, Guid userId, CancellationToken ct = default)
    {
        var reservation = await reservations.GetByIdAsync(reservationId, ct)
            ?? throw new KeyNotFoundException($"Reservation '{reservationId}' not found.");

        var attendeeIds = await attendees.GetAttendeeUserIdsAsync(reservationId, ct);
        if (reservation.UserId != userId && !attendeeIds.Contains(userId))
        {
            throw new UnauthorizedAccessException("Only the organizer or an attendee can check in.");
        }

        var now = (timeProvider ?? TimeProvider.System).GetUtcNow().UtcDateTime;
        if (now < reservation.StartTime.AddMinutes(-15))
        {
            throw new InvalidOperationException("You can only check in up to 15 minutes before the reservation starts.");
        }

        if (reservation.Status == ReservationStatus.Cancelled)
        {
            throw new InvalidOperationException("Cannot check in to a cancelled reservation.");
        }

        if (reservation.CheckedInAt.HasValue) return;

        reservation.CheckedInAt = now;
        await reservations.SaveChangesAsync(ct);
    }

    private async Task ExecuteCancelAsync(Reservation reservation, CancellationToken ct)
    {
        if (reservation.Status == ReservationStatus.Cancelled)
        {
            return;
        }

        var now = (timeProvider ?? TimeProvider.System).GetUtcNow().UtcDateTime;
        if (reservation.StartTime < now)
        {
            throw new InvalidOperationException("Cannot cancel a reservation that has already started.");
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

    private static ReservationResponse ToResponse(Reservation reservation, string username, IReadOnlyList<AttendeeSummary> attendeeSummaries) => new(
        reservation.Id,
        reservation.RoomId,
        reservation.UserId,
        username,
        reservation.StartTime,
        reservation.EndTime,
        reservation.Status,
        reservation.CreatedAt,
        attendeeSummaries,
        reservation.CheckedInAt);
}
