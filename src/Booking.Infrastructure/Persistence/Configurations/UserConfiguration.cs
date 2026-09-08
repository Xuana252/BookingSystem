using Booking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Booking.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Username).IsRequired().HasMaxLength(64);
        builder.Property(u => u.Email).IsRequired().HasMaxLength(256);
        builder.Property(u => u.PasswordHash).IsRequired();
        builder.Property(u => u.Role).IsRequired();
        builder.HasIndex(u => u.Email).IsUnique();
        builder.HasIndex(u => u.Username).IsUnique();

        // Bootstraps the first Admin — self-registration deliberately has no role selection (a
        // user picking their own role would defeat the point), so without this there'd be no way
        // to reach an Admin account at all. Dev-only credential, documented in README; not meant
        // to survive past local/demo use. HasData needs fixed values, not AddAsync — a real
        // runtime call would re-hash/re-insert on every startup instead of being one static seed
        // row baked into the migration.
        builder.HasData(new User
        {
            Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
            Username = "admin",
            Email = "admin@bookingsystem.local",
            PasswordHash = "$2a$11$wvqCJFb6sIzKGvEDm1DLwuqLLMXHixMb5nbebuuDZ5aMXtO8gKwwK", // "Admin@12345"
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = new DateTime(2026, 8, 31, 0, 0, 0, DateTimeKind.Utc)
        });
    }
}
