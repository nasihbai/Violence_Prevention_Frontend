/**
 * Types matching the Python backend's models — see
 * FYP_Violence_Prevention_backend/database/models.py.
 *
 * Field shapes follow the BE's *.to_dict() methods exactly so we can pass
 * API responses through without remapping.
 */

export type IncidentType = "violent" | "threatening";
export type Severity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "investigating" | "resolved" | "false_positive";

/** Single alert row, joined with its parent incident's severity / camera. */
export interface Alert {
  id: number;
  incident_id: number;
  type: IncidentType;
  confidence: number;
  /** ISO-8601 UTC */
  timestamp: string;
  acknowledged: boolean;
  acknowledged_by: number | null;
  acknowledged_at: string | null;
  dismissed: boolean;
  /** Comes from joined incident.severity */
  severity: Severity | null;
  /** Comes from joined incident.stream_id */
  camera_id: string | null;
}

export interface Incident {
  id: number;
  incident_code: string;
  stream_id: string;
  type: IncidentType;
  confidence: number;
  timestamp: string;
  location: string | null;
  screenshot_path: string | null;
  video_path: string | null;
  severity: Severity;
  status: IncidentStatus;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  /** Only present on GET /api/incidents/<id> (detail endpoint). */
  alerts?: Alert[];
}

/** Standard list-response envelope used by /api/alerts and /api/incidents. */
export interface ListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/** Filter set for both alerts and incidents lists. */
export interface AlertsQuery {
  status?: IncidentStatus;
  severity?: Severity;
  acknowledged?: boolean;
  limit?: number;
  offset?: number;
}

export interface IncidentsQuery {
  status?: IncidentStatus;
  severity?: Severity;
  limit?: number;
  offset?: number;
}
