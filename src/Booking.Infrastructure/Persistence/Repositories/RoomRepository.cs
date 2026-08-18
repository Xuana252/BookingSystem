using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Booking.Infrastructure.Persistence.Repositories;

public class RoomRepository(BookingDbContext db) : IRoomRepository
{
    public async Task<IReadOnlyList<Room>> GetAllAsync(CancellationToken ct = default)
        => await db.Rooms.AsNoTracking().ToListAsync(ct);

    public async Task AddAsync(Room room, CancellationToken ct = default)
        => await db.Rooms.AddAsync(room, ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
