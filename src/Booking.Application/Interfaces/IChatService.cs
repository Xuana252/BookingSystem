namespace Booking.Application.Interfaces;

public interface IChatService
{
    /// <summary>
    /// Sends <paramref name="message"/> on behalf of <paramref name="userId"/> and returns
    /// the assistant''s reply. Conversation history is maintained per <paramref name="sessionId"/>.
    /// </summary>
    Task<string> ChatAsync(string sessionId, string message, Guid userId, CancellationToken ct = default);
}
