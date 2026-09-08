using Booking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Booking.Infrastructure.Persistence.Configurations;

public class ReservationAttendeeConfiguration : IEntityTypeConfiguration<ReservationAttendee>
{
    public void Configure(EntityTypeBuilder<ReservationAttendee> builder)
    {
        builder.HasKey(a => a.Id);

        // Same user can't be added as an attendee on the same reservation twice.
        builder.HasIndex(a => new { a.ReservationId, a.UserId }).IsUnique();

        builder.HasOne<Reservation>().WithMany().HasForeignKey(a => a.ReservationId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<User>().WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
