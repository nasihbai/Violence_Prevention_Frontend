/**
 * Alerts store — manages the live list of alerts and the filter state.
 *
 * Two entry points for adding items:
 *  - fetchAlerts(): pulls from the BE on demand (initial mount, filter change)
 *  - onSocketAlert(alert): receives a 'violence_alert' WebSocket event and
 *    prepends to the list so it appears in real time.
 */
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  acknowledgeAlert as svcAcknowledge,
  dismissAlert as svcDismiss,
  listAlerts as svcList,
} from "@/services/alerts.service";
import type {
  Alert,
  AlertsQuery,
  IncidentStatus,
  Severity,
} from "@/types/alerts";

export const useAlertsStore = defineStore("alerts", () => {
  // ----- State -----
  const alerts = ref<Alert[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const filters = ref<{
    status?: IncidentStatus;
    severity?: Severity;
    acknowledged?: boolean;
  }>({});

  const pagination = ref({ limit: 50, offset: 0 });

  // ----- Getters -----
  const unacknowledgedCount = computed(
    () => alerts.value.filter((a) => !a.acknowledged && !a.dismissed).length,
  );

  // ----- Actions -----

  /** Fetch alerts from the BE using the current filters + pagination. */
  async function fetchAlerts(extra: Partial<AlertsQuery> = {}): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const query: AlertsQuery = {
        ...filters.value,
        limit: pagination.value.limit,
        offset: pagination.value.offset,
        ...extra,
      };
      const res = await svcList(query);
      alerts.value = res.items;
      total.value = res.total;
    } catch (e: any) {
      console.error("Failed to fetch alerts:", e);
      error.value = e?.data?.errors?._?.[0] || e?.message || "Failed to load alerts";
      alerts.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  }

  /** Replace one alert in the list (by id). No-op if not present. */
  function _replace(updated: Alert) {
    const idx = alerts.value.findIndex((a) => a.id === updated.id);
    if (idx !== -1) {
      alerts.value[idx] = updated;
    }
  }

  async function acknowledge(id: number): Promise<void> {
    try {
      const updated = await svcAcknowledge(id);
      _replace(updated);
    } catch (e: any) {
      console.error("Failed to acknowledge alert:", e);
      error.value = e?.data?.errors?._?.[0] || e?.message || "Failed to acknowledge alert";
      throw e;
    }
  }

  async function dismiss(id: number): Promise<void> {
    try {
      const updated = await svcDismiss(id);
      _replace(updated);
    } catch (e: any) {
      console.error("Failed to dismiss alert:", e);
      error.value = e?.data?.errors?._?.[0] || e?.message || "Failed to dismiss alert";
      throw e;
    }
  }

  /**
   * Called by the SocketIO listener when a 'violence_alert' event arrives.
   * Prepends to the visible list so the UI updates immediately.
   * Total is incremented so paginated counts stay sensible.
   */
  function onSocketAlert(alert: Alert): void {
    // Avoid duplicate insert if the same id arrives twice (e.g. server
    // reconnect re-replays the latest event)
    if (alerts.value.some((a) => a.id === alert.id)) return;
    alerts.value = [alert, ...alerts.value];
    total.value += 1;
  }

  function setFilter<K extends keyof typeof filters.value>(
    key: K,
    value: (typeof filters.value)[K],
  ): void {
    if (value === undefined || value === null || value === ("" as any)) {
      delete filters.value[key];
    } else {
      filters.value[key] = value;
    }
    pagination.value.offset = 0;
  }

  function clearFilters(): void {
    filters.value = {};
    pagination.value.offset = 0;
  }

  return {
    // state
    alerts,
    total,
    loading,
    error,
    filters,
    pagination,
    // getters
    unacknowledgedCount,
    // actions
    fetchAlerts,
    acknowledge,
    dismiss,
    onSocketAlert,
    setFilter,
    clearFilters,
  };
});
