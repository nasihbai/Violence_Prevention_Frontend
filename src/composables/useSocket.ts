/**
 * useSocket — singleton SocketIO client.
 *
 * The Python backend's SocketIO server emits:
 *   - 'violence_alert'  → fires when the detector flags an incident.
 *                         Payload: full Alert object (matches Alert.to_dict()).
 *   - 'stats_update'    → fires every 1s with live detector stats.
 *
 * The connection is created once per page-load and reused. The composable
 * returns the socket so callers can register additional listeners if
 * needed, but the canonical wiring (push alerts into the Pinia store) is
 * done here so the store stays live even before any component mounts.
 */
import { io, Socket } from "socket.io-client";
import { useAlertsStore } from "@/stores/alerts";
import { useStatsStore } from "@/stores/stats";
import type { Alert } from "@/types/alerts";
import type { DetectorStats } from "@/services/stats.service";

let socket: Socket | null = null;

function getSocketUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl) return envUrl;
  if (typeof window !== "undefined" && window.API_URL) return window.API_URL;
  return "http://localhost:5000";
}

function initSocket(): Socket {
  if (socket) return socket;

  socket = io(getSocketUrl(), {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    autoConnect: true,
  });

  socket.on("connect", () => {
    if (import.meta.env.DEV) console.log("[socket] connected:", socket?.id);
  });
  socket.on("disconnect", (reason) => {
    if (import.meta.env.DEV) console.log("[socket] disconnected:", reason);
  });
  socket.on("connect_error", (err) => {
    if (import.meta.env.DEV) console.warn("[socket] connect_error:", err.message);
  });

  // Wire BE events into Pinia. The store is loaded lazily so the
  // composable can be imported without Pinia being installed yet (i.e.
  // during SSR or tests).
  socket.on("violence_alert", (payload: Alert) => {
    if (import.meta.env.DEV) console.log("[socket] violence_alert:", payload);
    try {
      const alertsStore = useAlertsStore();
      alertsStore.onSocketAlert(payload);
    } catch (e) {
      // Pinia not ready yet — non-fatal, alerts will refresh on next fetch.
      console.warn("[socket] alerts store unavailable:", e);
    }
  });

  socket.on("stats_update", (payload: DetectorStats) => {
    try {
      const statsStore = useStatsStore();
      statsStore.onStatsUpdate(payload);
    } catch (e) {
      console.warn("[socket] stats store unavailable:", e);
    }
  });

  return socket;
}

/** Lazy accessor — call inside a component setup or anywhere downstream. */
export function useSocket(): Socket {
  return initSocket();
}

/** Tear down the singleton (useful for tests or HMR cleanup). */
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
