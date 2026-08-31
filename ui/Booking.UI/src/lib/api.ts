import { apiClient } from "./apiClient";
import type { Reservation, Room } from "./types";

export interface CreateReservationRequest {
  roomId: string;
  startTime: string;
  endTime: string;
}

export const getRooms = () => apiClient.get<Room[]>("/rooms");

export const getReservations = () => apiClient.get<Reservation[]>("/reservations");

export const createReservation = (request: CreateReservationRequest) =>
  apiClient.post<Reservation>("/reservations", request);

export const cancelReservation = (id: string) => apiClient.post<void>(`/reservations/${id}/cancel`);
