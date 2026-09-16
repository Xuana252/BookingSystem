// Mirrors Booking.Application/DTOs/AuthDTOs.cs — ASP.NET Core serializes to camelCase by default.
export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
}

// Mirrors Booking.Domain/Entities/Room.cs.
export interface Room {
  id: string;
  name: string;
  location: string;
  capacity: number;
  amenities: string[];
  webhookUrls: string[];
  isActive: boolean;
  createdAt: string;
}

// Mirrors Booking.Domain/Entities/Reservation.cs's ReservationStatus enum — no
// JsonStringEnumConverter is configured, so this comes over the wire as a plain number.
// A const object, not a TS `enum` — this project's tsconfig has erasableSyntaxOnly on, which
// rejects real enums since they compile to runtime code rather than erasing away.
export const ReservationStatus = {
  Confirmed: 0,
  Cancelled: 1,
} as const;
export type ReservationStatus = (typeof ReservationStatus)[keyof typeof ReservationStatus];

export const UserRole = {
  Employee: 0,
  Admin: 1,
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface UserSummary {
  id: string;
  username: string;
}

// Mirrors Booking.Application/DTOs/UserDTOs.cs's UserManagementResponse
export interface UserManagementItem {
  id: string;
  username: string;
  email: string;
  role: UserRole | number | string;
  isActive: boolean;
}

export interface AttendeeSummary {
  userId: string;
  username: string;
}

// Mirrors Booking.Application/DTOs/ReservationDTOs.cs's ReservationResponse (not the raw
// Reservation entity — this carries the booker's Username too, looked up server-side, and Attendees).
export interface Reservation {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  createdAt: string;
  attendees: AttendeeSummary[];
}
