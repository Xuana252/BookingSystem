namespace Booking.Domain.Entities;

/// <summary>
/// A bookable resource (meeting room, desk, facility).
/// </summary>
public class Room
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public List<string> Amenities { get; set; } = new();

    /// <summary>
    /// MS Teams (or Slack) webhook URLs to notify when this room is booked.
    /// </summary>
    public List<string> WebhookUrls { get; set; } = new();

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
