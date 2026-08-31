import { apiClient } from "./apiClient";
import type { Reservation, Room } from "./types";

export interface CreateReservationRequest {
  roomId: string;
  startTime: string;
  endTime: string;
}

export interface CreateRoomRequest {
  name: string;
  location: string;
  capacity: number;
}

export const getRooms = () => apiClient.get<Room[]>("/rooms");

export const createRoom = (request: CreateRoomRequest) => apiClient.post<Room>("/rooms", request);

export const getReservations = () => apiClient.get<Reservation[]>("/reservations");

export const createReservation = (request: CreateReservationRequest) =>
  apiClient.post<Reservation>("/reservations", request);

export const cancelReservation = (id: string) => apiClient.post<void>(`/reservations/${id}/cancel`);
