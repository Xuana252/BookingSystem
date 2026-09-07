using Booking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Booking.Infrastructure.Persistence.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Type).HasConversion<string>().HasMaxLength(32);
        builder.Property(n => n.Message).IsRequired();
        builder.Property(n => n.IsRead).IsRequired().HasDefaultValue(false);
        builder.Property(n => n.ReadAt).IsRequired(false);

        builder.HasOne<User>().WithMany().HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Reservation>().WithMany().HasForeignKey(n => n.ReservationId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(n => n.UserId);
        builder.HasIndex(n => new { n.UserId, n.IsRead });
    }
}
