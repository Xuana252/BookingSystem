using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Booking.Infrastructure.Persistence.Repositories;

public class ReservationRepository(BookingDbContext db) : IReservationRepository
{
    public async Task<IReadOnlyList<Reservation>> GetAllAsync(CancellationToken ct = default)
        => await db.Reservations.AsNoTracking().ToListAsync(ct);

    public async Task AddAsync(Reservation reservation, CancellationToken ct = default)
        => await db.Reservations.AddAsync(reservation, ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
