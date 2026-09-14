using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Booking.Infrastructure.Persistence.Repositories;

public class ReservationRepository(BookingDbContext db) : IReservationRepository
{
    public async Task<IReadOnlyList<Reservation>> GetAllAsync(CancellationToken ct = default)
        => await db.Reservations.AsNoTracking().ToListAsync(ct);

    // Deliberately tracked, unlike every other read here — callers (ReservationService.CancelAsync)
    // mutate the returned entity and rely on EF Core's change tracking to persist it via
    // SaveChangesAsync, rather than going through a separate UpdateAsync.
    public Task<Reservation?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => db.Reservations.FirstOrDefaultAsync(r => r.Id == id, ct);

    public async Task<IReadOnlyList<Reservation>> GetByRoomIdAsync(Guid roomId, CancellationToken ct = default)
        => await db.Reservations.AsNoTracking().Where(r => r.RoomId == roomId).ToListAsync(ct);

    public async Task<IReadOnlyList<Reservation>> GetUpcomingAsync(DateTime from, DateTime to, CancellationToken ct = default)
        => await db.Reservations.AsNoTracking()
            .Where(r => r.Status == ReservationStatus.Confirmed && r.StartTime >= from && r.StartTime <= to)
            .ToListAsync(ct);

    public async Task AddAsync(Reservation reservation, CancellationToken ct = default)
        => await db.Reservations.AddAsync(reservation, ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
