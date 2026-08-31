import * as signalR from "@microsoft/signalr";
import { getToken } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5133/api";
// Booking.Api maps the hub at "/hubs/reservations" (Program.cs), not under "/api" — strip that
// suffix off whatever base URL the REST client uses instead of hardcoding a second origin.
const HUB_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export function createReservationHubConnection(): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${HUB_BASE_URL}/hubs/reservations`, {
      // WebSocket/SSE transports can't set an Authorization header — Program.cs's
      // JwtBearerEvents.OnMessageReceived reads the token back out of this query string
      // parameter specifically for requests under /hubs.
      accessTokenFactory: () => getToken() ?? "",
    })
    .withAutomaticReconnect()
    .build();
}
