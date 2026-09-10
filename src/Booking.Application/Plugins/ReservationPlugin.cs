using System.ComponentModel;
using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Microsoft.SemanticKernel;

namespace Booking.Application.Plugins;

/// <summary>
/// Semantic Kernel plugin that gives the LLM read-only access to reservation data.
/// </summary>
public sealed class ReservationPlugin(IReservationService reservationService)
{
    [KernelFunction, Description(
        "List all reservations in the system. " +
        "Returns each reservation's room, time slot, status (Confirmed/Cancelled), and who booked it.")]
    public async Task<string> ListReservationsAsync(CancellationToken cancellationToken = default)
    {
        var all = await reservationService.GetAllAsync(cancellationToken);

        var confirmed = all.Where(r => r.Status == ReservationStatus.Confirmed).ToList();

        if (confirmed.Count == 0)
            return "There are no confirmed reservations at the moment.";

        var lines = confirmed.Select(r =>
            $"- Room {r.RoomId} | {r.StartTime:ddd dd MMM, HH:mm} – {r.EndTime:HH:mm} UTC | Booked by: {r.Username}");

        return $"Confirmed reservations ({confirmed.Count} total):\n{string.Join("\n", lines)}";
    }

    [KernelFunction, Description(
        "Check whether any rooms are available (not already booked) during a requested time window. " +
        "Provide a start time and an end time in ISO 8601 format (e.g. 2026-09-11T14:00:00Z).")]
    public async Task<string> CheckAvailabilityAsync(
        [Description("Requested start time in ISO 8601 format.")] DateTime startTime,
        [Description("Requested end time in ISO 8601 format.")] DateTime endTime,
        CancellationToken cancellationToken = default)
    {
        var all = await reservationService.GetAllAsync(cancellationToken);

        // Collect room IDs that have a conflicting confirmed reservation in the window
        var conflictingRoomIds = all
            .Where(r =>
                r.Status == ReservationStatus.Confirmed &&
                startTime < r.EndTime && endTime > r.StartTime)
            .Select(r => r.RoomId)
            .ToHashSet();

        if (conflictingRoomIds.Count == 0)
            return $"No reservations conflict with {startTime:HH:mm} – {endTime:HH:mm} UTC on {startTime:ddd dd MMM yyyy}. " +
                   "All rooms appear to be available in that window.";

        return $"{conflictingRoomIds.Count} room(s) are already booked for " +
               $"{startTime:HH:mm} – {endTime:HH:mm} UTC on {startTime:ddd dd MMM yyyy}. " +
               $"Use ListRooms and cross-reference with ListReservations to see which specific rooms are free.";
    }
}

