/**
 * Alerts API client — wraps the BE's /api/alerts/* endpoints.
 * Components / stores should call these, not ofetch / api directly.
 *
 * Every call goes through unwrap() so a failed request (status >= 400)
 * becomes a thrown error instead of a silently-empty success.
 */
import { apiGet, apiPost, unwrap } from "@/services/api";
import type { Alert, AlertsQuery, ListResponse } from "@/types/alerts";

// Alerts are live data — never serve a stale cached list.
const NO_CACHE = { cache: false } as const;

/** GET /api/alerts with optional filters + pagination. */
export async function listAlerts(query: AlertsQuery = {}): Promise<ListResponse<Alert>> {
  const params: Record<string, string | number> = {};
  if (query.status) params.status = query.status;
  if (query.severity) params.severity = query.severity;
  if (query.acknowledged !== undefined) params.acknowledged = String(query.acknowledged);
  if (query.limit !== undefined) params.limit = query.limit;
  if (query.offset !== undefined) params.offset = query.offset;

  return unwrap(await apiGet<ListResponse<Alert>>("/api/alerts", params, NO_CACHE));
}

/** POST /api/alerts/<id>/acknowledge — marks alert acknowledged_by current user. */
export async function acknowledgeAlert(id: number): Promise<Alert> {
  return unwrap(await apiPost<Alert>(`/api/alerts/${id}/acknowledge`, {}));
}

/** POST /api/alerts/<id>/dismiss — marks alert dismissed. */
export async function dismissAlert(id: number): Promise<Alert> {
  return unwrap(await apiPost<Alert>(`/api/alerts/${id}/dismiss`, {}));
}

/**
 * POST /api/test/fire-alert — only available on the slim auth-only server.
 * Synthesizes a new incident + alert and emits a 'violence_alert' SocketIO
 * event. Useful for demoing the live-update path without running the
 * detector.
 */
export async function fireTestAlert(opts: {
  type?: "violent" | "threatening";
  severity?: "low" | "medium" | "high" | "critical";
  confidence?: number;
} = {}): Promise<Alert> {
  return unwrap(await apiPost<Alert>("/api/test/fire-alert", opts));
}
