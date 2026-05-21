/**
 * Detector stats API client — wraps GET /api/stats (live detector stats).
 *
 * The BE also pushes the same shape over SocketIO every ~1s as the
 * 'stats_update' event; getStats() is the one-shot fetch for initial load.
 */
import { apiGet, unwrap } from "@/services/api";

/** Live detector stats — matches web/app.py GET /api/stats + 'stats_update'. */
export interface DetectorStats {
  total_frames: number;
  violence_detections: number;
  alerts_triggered: number;
  current_fps: number;
  uptime: string | null;
  is_running: boolean;
}

const NO_CACHE = { cache: false } as const;

/** GET /api/stats — current detector stats. */
export async function getStats(): Promise<DetectorStats> {
  return unwrap(await apiGet<DetectorStats>("/api/stats", undefined, NO_CACHE));
}
