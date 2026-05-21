/**
 * Detection-logs API client — wraps GET /api/detection-logs.
 *
 * DetectionLog rows are written by the detector every ~30 frames; this
 * surfaces them for the Detection Activity page.
 */
import { apiGet, unwrap } from "@/services/api";
import type { ListResponse } from "@/types/alerts";

export interface DetectionLog {
  id: number;
  stream_id: string;
  timestamp: string;
  person_count: number | null;
  processing_time_ms: number | null;
  detections: unknown;
}

export interface DetectionLogsQuery {
  stream_id?: string;
  limit?: number;
  offset?: number;
}

const NO_CACHE = { cache: false } as const;

/** GET /api/detection-logs — recent detection log rows. */
export async function listDetectionLogs(
  query: DetectionLogsQuery = {},
): Promise<ListResponse<DetectionLog>> {
  const params: Record<string, string | number> = {};
  if (query.stream_id) params.stream_id = query.stream_id;
  if (query.limit !== undefined) params.limit = query.limit;
  if (query.offset !== undefined) params.offset = query.offset;
  return unwrap(await apiGet<ListResponse<DetectionLog>>("/api/detection-logs", params, NO_CACHE));
}
