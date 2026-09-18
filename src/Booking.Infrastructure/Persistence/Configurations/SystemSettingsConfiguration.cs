using Booking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Booking.Infrastructure.Persistence.Configurations;

public class SystemSettingsConfiguration : IEntityTypeConfiguration<SystemSettings>
{
    public void Configure(EntityTypeBuilder<SystemSettings> builder)
    {
        builder.HasKey(s => s.Id);
        
        // Seed default row
        builder.HasData(new SystemSettings
        {
            Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
            MaxBookingLeadTimeDays = 30,
            AutoCancelMinutes = 15
        });
    }
}
