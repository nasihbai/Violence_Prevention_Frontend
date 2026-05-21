/**
 * Analytics API client — wraps GET /api/analytics/incidents.
 */
import { apiGet, unwrap } from "@/services/api";
import type { IncidentStatus, Severity, IncidentType } from "@/types/alerts";

export interface IncidentAnalytics {
  total: number;
  by_day: { date: string; count: number }[];
  by_severity: Record<Severity, number>;
  by_status: Record<IncidentStatus, number>;
  by_type: Record<IncidentType, number>;
  by_camera: { stream_id: string; count: number }[];
}

const NO_CACHE = { cache: false } as const;

/** GET /api/analytics/incidents — aggregated incident counts. */
export async function getIncidentAnalytics(): Promise<IncidentAnalytics> {
  return unwrap(await apiGet<IncidentAnalytics>("/api/analytics/incidents", undefined, NO_CACHE));
}
