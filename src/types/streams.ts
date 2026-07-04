/**
 * Camera stream types — matches the BE Stream model
 * (FYP_Violence_Prevention_backend/database/models.py → Stream.to_dict()).
 */
import type { ListResponse } from "@/types/alerts";

export interface Stream {
  id: number;
  /** Human-facing unique code, e.g. "CAM_01". Immutable once created. */
  stream_id: string;
  name: string;
  /** RTSP URL or local webcam index (as a string). */
  source_url: string;
  location: string | null;
  is_active: boolean;
  /** True when the backend currently has a running detector worker for this camera. */
  is_live: boolean;
}

/** Payload for creating a stream. */
export interface CreateStreamInput {
  stream_id: string;
  name: string;
  source_url: string;
  location?: string;
  is_active?: boolean;
}

/** Payload for updating a stream — stream_id is immutable, so excluded. */
export type UpdateStreamInput = Partial<{
  name: string;
  source_url: string;
  location: string;
  is_active: boolean;
}>;

export type StreamListResponse = ListResponse<Stream>;
