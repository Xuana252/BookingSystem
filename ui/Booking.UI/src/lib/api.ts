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
}

// Room endpoints
export const getRooms = (includeInactive = false) =>
  apiClient.get<Room[]>(`/rooms${includeInactive ? "?includeInactive=true" : ""}`);
export const getAllRooms = () => apiClient.get<Room[]>("/rooms/all");
export const createRoom = (request: CreateRoomRequest) => apiClient.post<Room>("/rooms", request);
export const deactivateRoom = (id: string) => apiClient.post<void>(`/rooms/${id}/deactivate`);
export const activateRoom = (id: string) => apiClient.post<void>(`/rooms/${id}/activate`);

// Reservation endpoints
export const getReservations = () => apiClient.get<Reservation[]>("/reservations");
export const createReservation = (request: CreateReservationRequest) =>
  apiClient.post<Reservation>("/reservations", request);
export const cancelReservation = (id: string) => apiClient.post<void>(`/reservations/${id}/cancel`);

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
