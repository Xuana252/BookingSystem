// Mirrors Booking.Application/DTOs/AuthDTOs.cs — ASP.NET Core serializes to camelCase by default.
export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
}
