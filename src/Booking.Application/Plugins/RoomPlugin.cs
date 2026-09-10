using System.ComponentModel;
using Booking.Application.Interfaces;
using Microsoft.SemanticKernel;

namespace Booking.Application.Plugins;

/// <summary>
/// Semantic Kernel plugin that gives the LLM read-only access to room data.
/// Each public method decorated with [KernelFunction] becomes a callable tool.
/// </summary>
public sealed class RoomPlugin(IRoomService roomService)
{
    [KernelFunction, Description("List all active bookable rooms with their name, location, and seating capacity.")]
    public async Task<string> ListRoomsAsync(CancellationToken cancellationToken = default)
    {
        var rooms = await roomService.GetAllAsync(cancellationToken);

        if (rooms.Count == 0)
            return "There are currently no active rooms available for booking.";

        var lines = rooms.Select(r =>
            $"- {r.Name} | Location: {r.Location} | Capacity: {r.Capacity} seats");

        return $"Active rooms ({rooms.Count} total):\n{string.Join("\n", lines)}";
    }
}
