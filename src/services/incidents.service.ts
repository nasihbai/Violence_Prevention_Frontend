/**
 * Incidents API client — wraps the BE's /api/incidents/* endpoints.
 *
 * Every call goes through unwrap() so a failed request (status >= 400)
 * becomes a thrown error instead of a silently-empty success.
 */
import { apiGet, apiPatch, unwrap } from "@/services/api";
import type {
  Incident,
  IncidentStatus,
  IncidentsQuery,
  ListResponse,
  Severity,
} from "@/types/alerts";

// Live data — never serve a stale cached incident list/detail.
const NO_CACHE = { cache: false } as const;

/** GET /api/incidents with optional filters + pagination. */
export async function listIncidents(query: IncidentsQuery = {}): Promise<ListResponse<Incident>> {
  const params: Record<string, string | number> = {};
  if (query.status) params.status = query.status;
  if (query.severity) params.severity = query.severity;
  if (query.limit !== undefined) params.limit = query.limit;
  if (query.offset !== undefined) params.offset = query.offset;

  return unwrap(await apiGet<ListResponse<Incident>>("/api/incidents", params, NO_CACHE));
}

/** GET /api/incidents/<id> — returns the incident with its embedded alerts. */
export async function getIncident(id: number): Promise<Incident> {
  return unwrap(await apiGet<Incident>(`/api/incidents/${id}`, undefined, NO_CACHE));
}

/**
 * PATCH /api/incidents/<id> — admin/superadmin only. Update status,
 * severity, or notes on an incident.
 */
export async function updateIncident(
  id: number,
  patch: Partial<{ status: IncidentStatus; severity: Severity; notes: string }>,
): Promise<Incident> {
  return unwrap(await apiPatch<Incident>(`/api/incidents/${id}`, patch));
}
