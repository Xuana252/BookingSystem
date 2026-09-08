import { useContext } from "react";
import { ReservationHubContext, type ReservationHubContextValue } from "../contexts/ReservationHubContext";

export function useReservationHub(): ReservationHubContextValue {
  const context = useContext(ReservationHubContext);
  if (!context) {
    throw new Error("useReservationHub must be used within a ReservationHubProvider.");
  }
  return context;
}
