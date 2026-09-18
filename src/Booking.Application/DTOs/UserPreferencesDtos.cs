namespace Booking.Application.DTOs;

public record UserPreferencesDto(
    string TimeZoneId,
    bool EmailAlertsEnabled,
    bool AutoDeclineConflicts
);

public record UpdateUserPreferencesRequest(
    string TimeZoneId,
    bool EmailAlertsEnabled,
    bool AutoDeclineConflicts
);
