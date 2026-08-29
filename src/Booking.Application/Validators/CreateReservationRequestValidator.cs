using Booking.Application.DTOs;
using FluentValidation;

namespace Booking.Application.Validators;

public class CreateReservationRequestValidator : AbstractValidator<CreateReservationRequest>
{
    public CreateReservationRequestValidator()
    {
        RuleFor(x => x.RoomId)
            .NotEmpty().WithMessage("Please select a room to reserve.");

        RuleFor(x => x.StartTime)
            .NotEqual(default(DateTime)).WithMessage("Please provide a start time for the reservation.");

        RuleFor(x => x.EndTime)
            .NotEqual(default(DateTime)).WithMessage("Please provide an end time for the reservation.");
    }
}
