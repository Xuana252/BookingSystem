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
  checkedInAt?: string | null;
}

// Feature 1: System Settings
export interface SystemSettings {
  id: string;
  maxBookingLeadTimeDays: number;
  autoCancelMinutes: number;
  businessHoursStart: string;
  businessHoursEnd: string;
  maxDurationHours: number;
  timeZoneId: string;
}

// Feature 2: Maintenance Issues
export const MaintenanceIssuePriority = {
  Low: 0,
  Medium: 1,
  High: 2,
} as const;
export type MaintenanceIssuePriority = (typeof MaintenanceIssuePriority)[keyof typeof MaintenanceIssuePriority];

export const MaintenanceIssueStatus = {
  Open: 0,
  InProgress: 1,
  Resolved: 2,
} as const;
export type MaintenanceIssueStatus = (typeof MaintenanceIssueStatus)[keyof typeof MaintenanceIssueStatus];

export interface MaintenanceIssue {
  id: string;
  roomId: string;
  reporterUserId: string;
  description: string;
  priority: MaintenanceIssuePriority | number;
  status: MaintenanceIssueStatus | number;
  createdAt: string;
  resolvedAt?: string;
}

// Feature 3: Audit Logs
export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  actionType: string;
  entityName: string;
  entityId: string;
  details: string;
}

// Feature 4: My Preferences
export interface UserPreferences {
  timeZoneId: string;
  emailAlertsEnabled: boolean;
  autoDeclineConflicts: boolean;
}

// Feature 5: Colleague Directory
export interface ColleagueDirectoryItem {
  id: string;
  username: string;
  department: string;
  isAvailable: boolean;
  currentMeetingRoomId?: string;
}
