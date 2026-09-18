import { apiClient } from "./apiClient";
import type { AuthResponse, Reservation, Room, UserManagementItem, UserSummary } from "./types";

export interface RegisterUserRequest {
  username: string;
  email: string;
  password: string;
}

export interface CreateReservationRequest {
  roomId: string;
  startTime: string;
  endTime: string;
  attendeeUserIds?: string[];
}

export interface CreateRoomRequest {
  name: string;
  location: string;
  capacity: number;
  amenities?: string[];
}

export interface UpdateRoomRequest {
  name: string;
  location: string;
  capacity: number;
  amenities?: string[];
  webhookUrls?: string[];
}

// Room endpoints
export const getRooms = (includeInactive = false) =>
  apiClient.get<Room[]>(`/rooms${includeInactive ? "?includeInactive=true" : ""}`);
export const getAllRooms = () => apiClient.get<Room[]>("/rooms/all");
export const createRoom = (request: CreateRoomRequest) => apiClient.post<Room>("/rooms", request);
export const updateRoom = (id: string, request: UpdateRoomRequest) => apiClient.put<Room>(`/rooms/${id}`, request);
export const deactivateRoom = (id: string) => apiClient.post<void>(`/rooms/${id}/deactivate`);
export const activateRoom = (id: string) => apiClient.post<void>(`/rooms/${id}/activate`);
export const updateRoomWebhooks = (id: string, webhookUrls: string[]) =>
  apiClient.put<void>(`/rooms/${id}/webhooks`, webhookUrls);
export const updateRoomAmenities = (id: string, amenities: string[]) =>
  apiClient.put<void>(`/rooms/${id}/amenities`, amenities);

// Reservation endpoints
export const getReservations = () => apiClient.get<Reservation[]>("/reservations");
export const createReservation = (request: CreateReservationRequest) =>
  apiClient.post<Reservation>("/reservations", request);
export const cancelReservation = (id: string) => apiClient.post<void>(`/reservations/${id}/cancel`);
export const checkInReservation = (id: string) => apiClient.post<void>(`/reservations/${id}/check-in`);

// User endpoints
export const getUsers = () => apiClient.get<UserSummary[]>("/users");
export const getAllUsers = () => apiClient.get<UserManagementItem[]>("/users/all");
export const registerUser = (request: RegisterUserRequest) =>
  apiClient.post<AuthResponse>("/auth/register", request);
export const deactivateUser = (id: string) => apiClient.post<void>(`/users/${id}/deactivate`);
export const activateUser = (id: string) => apiClient.post<void>(`/users/${id}/activate`);
export const promoteUser = (id: string) => apiClient.post<void>(`/users/${id}/promote`);
export const demoteUser = (id: string) => apiClient.post<void>(`/users/${id}/demote`);

// Notification endpoints
export interface UserNotification {
  id: string;
  userId: string;
  reservationId: string;
  type: number | string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export const getNotifications = () => apiClient.get<UserNotification[]>("/notifications");
export const markNotificationAsRead = (id: string) => apiClient.post<void>(`/notifications/${id}/read`);
export const markAllNotificationsAsRead = () => apiClient.post<void>("/notifications/read-all");

import type { SystemSettings, MaintenanceIssue, AuditLog, UserPreferences, ColleagueDirectoryItem } from "./types";

// Feature 1: System Settings
export const getSystemSettings = () => apiClient.get<SystemSettings>("/systemsettings");
export const updateSystemSettings = (settings: SystemSettings) => apiClient.put<SystemSettings>("/systemsettings", settings);

// Feature 2: Maintenance Issues
export const getMaintenanceIssues = () => apiClient.get<MaintenanceIssue[]>("/maintenance");
export const createMaintenanceIssue = (request: { roomId: string; description: string; priority: number }) => 
  apiClient.post<MaintenanceIssue>("/maintenance", request);
export const updateMaintenanceStatus = (id: string, status: number) => 
  apiClient.patch<MaintenanceIssue>(`/maintenance/${id}/status`, { status });

// Feature 3: Audit Logs
export const getAuditLogs = () => apiClient.get<AuditLog[]>("/auditlogs");

// Feature 4: My Preferences
export const getMyPreferences = () => apiClient.get<UserPreferences>("/users/me/preferences");
export const updateMyPreferences = (prefs: UserPreferences) => apiClient.put<UserPreferences>("/users/me/preferences", prefs);

// Feature 5: Colleague Directory
export const getDirectory = () => apiClient.get<ColleagueDirectoryItem[]>("/users/directory");
