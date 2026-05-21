/**
 * Stats store — the live detector stats blob.
 *
 * Fed two ways:
 *  - fetchStats(): one-shot GET /api/stats (initial load)
 *  - onStatsUpdate(): the SocketIO 'stats_update' event, ~1s cadence
 *    (wired in composables/useSocket.ts)
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import { getStats, type DetectorStats } from "@/services/stats.service";

const EMPTY: DetectorStats = {
  total_frames: 0,
  violence_detections: 0,
  alerts_triggered: 0,
  current_fps: 0,
  uptime: null,
  is_running: false,
};

export const useStatsStore = defineStore("stats", () => {
  const stats = ref<DetectorStats>({ ...EMPTY });
  const loading = ref(false);
  const error = ref<string | null>(null);

  /** One-shot fetch (initial load). */
  async function fetchStats(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      stats.value = await getStats();
    } catch (e: any) {
      console.error("Failed to fetch stats:", e);
      error.value = e?.data?.errors?._?.[0] || e?.message || "Failed to load stats";
    } finally {
      loading.value = false;
    }
  }

  /** Live update from the 'stats_update' SocketIO event. */
  function onStatsUpdate(payload: Partial<DetectorStats>): void {
    stats.value = { ...EMPTY, ...stats.value, ...payload };
  }

  return { stats, loading, error, fetchStats, onStatsUpdate };
});
