/**
 * Incidents API client — wraps the BE's /api/incidents/* endpoints.
 */
import { apiGet, apiPatch } from "@/services/api";
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

  const { data } = await apiGet<ListResponse<Incident>>("/api/incidents", params, NO_CACHE);
  return data;
}

/** GET /api/incidents/<id> — returns the incident with its embedded alerts. */
export async function getIncident(id: number): Promise<Incident> {
  const { data } = await apiGet<Incident>(`/api/incidents/${id}`, undefined, NO_CACHE);
  return data;
}

/**
 * PATCH /api/incidents/<id> — admin/superadmin only. Update status,
 * severity, or notes on an incident.
 */
export async function updateIncident(
  id: number,
  patch: Partial<{ status: IncidentStatus; severity: Severity; notes: string }>,
): Promise<Incident> {
  const { data } = await apiPatch<Incident>(`/api/incidents/${id}`, patch);
  return data;
}
