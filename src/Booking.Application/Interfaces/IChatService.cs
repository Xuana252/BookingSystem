using Booking.Application.DTOs;

namespace Booking.Application.Interfaces;

public interface IChatService
{
    /// <summary>
    /// Sends <paramref name="message"/> on behalf of <paramref name="userId"/> and returns
    /// a <see cref="ChatResult"/> containing the assistant's reply and any structured room data
    /// fetched during this turn. Conversation history is maintained per <paramref name="sessionId"/>.
    /// </summary>
    Task<ChatResult> ChatAsync(string sessionId, string message, Guid userId, CancellationToken ct = default);
}
