using System.ComponentModel.DataAnnotations;

namespace Booking.Application.DTOs;

public record CreateRoomRequest(
    [property: Required(ErrorMessage = "Room name is required.")]
    [property: StringLength(200, ErrorMessage = "Room name can't be longer than 200 characters.")]
    string Name,

    [property: Required(ErrorMessage = "Room location is required.")]
    [property: StringLength(200, ErrorMessage = "Room location can't be longer than 200 characters.")]
    string Location,

    [property: Range(1, int.MaxValue, ErrorMessage = "Room capacity must be at least 1.")]
    int Capacity);
