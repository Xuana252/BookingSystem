using System.ComponentModel.DataAnnotations;

namespace Booking.Application.DTOs;

public record CreateReservationRequest(Guid RoomId, DateTime StartTime, DateTime EndTime) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (RoomId == Guid.Empty)
        {
            yield return new ValidationResult("Please select a room to reserve.", [nameof(RoomId)]);
        }

        if (StartTime == default)
        {
            yield return new ValidationResult("Please provide a start time for the reservation.", [nameof(StartTime)]);
        }

        if (EndTime == default)
        {
            yield return new ValidationResult("Please provide an end time for the reservation.", [nameof(EndTime)]);
        }
    }
}
