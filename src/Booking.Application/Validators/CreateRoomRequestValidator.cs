using Booking.Application.DTOs;
using FluentValidation;

namespace Booking.Application.Validators;

public class CreateRoomRequestValidator : AbstractValidator<CreateRoomRequest>
{
    public CreateRoomRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Room name is required.")
            .MaximumLength(200).WithMessage("Room name can't be longer than 200 characters.");

        RuleFor(x => x.Location)
            .NotEmpty().WithMessage("Room location is required.")
            .MaximumLength(200).WithMessage("Room location can't be longer than 200 characters.");

        RuleFor(x => x.Capacity)
            .GreaterThanOrEqualTo(1).WithMessage("Room capacity must be at least 1.");
    }
}
