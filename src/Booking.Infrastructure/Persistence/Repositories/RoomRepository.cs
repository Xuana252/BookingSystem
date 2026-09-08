using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Booking.Infrastructure.Persistence.Repositories;

public class RoomRepository(BookingDbContext db) : IRoomRepository
{
    public async Task<IReadOnlyList<Room>> GetAllAsync(CancellationToken ct = default)
        => await db.Rooms.AsNoTracking().ToListAsync(ct);

    // Deliberately tracked, unlike GetAllAsync — RoomService.{Activate,Deactivate}Async mutate
    // the returned entity and rely on EF Core's change tracking to persist it via
    // SaveChangesAsync, the same pattern ReservationRepository.GetByIdAsync uses.
    public async Task<Room?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await db.Rooms.FirstOrDefaultAsync(r => r.Id == id, ct);

    public async Task AddAsync(Room room, CancellationToken ct = default)
        => await db.Rooms.AddAsync(room, ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
