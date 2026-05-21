/**
 * Streams API client — wraps the BE's /api/streams/* endpoints.
 */
import { apiGet, apiPost, apiPatch, apiDelete } from "@/services/api";
import type {
  Stream,
  StreamListResponse,
  CreateStreamInput,
  UpdateStreamInput,
} from "@/types/streams";

/** GET /api/streams — optionally filter by active state. */
export async function listStreams(isActive?: boolean): Promise<StreamListResponse> {
  const params: Record<string, string> = {};
  if (isActive !== undefined) params.is_active = String(isActive);
  const { data } = await apiGet<StreamListResponse>("/api/streams", params);
  return data;
}

/** GET /api/streams/<pk>. */
export async function getStream(pk: number): Promise<Stream> {
  const { data } = await apiGet<Stream>(`/api/streams/${pk}`);
  return data;
}

/** POST /api/streams — manage role required. */
export async function createStream(input: CreateStreamInput): Promise<Stream> {
  const { data } = await apiPost<Stream>("/api/streams", input);
  return data;
}

/** PATCH /api/streams/<pk> — manage role required. */
export async function updateStream(pk: number, patch: UpdateStreamInput): Promise<Stream> {
  const { data } = await apiPatch<Stream>(`/api/streams/${pk}`, patch);
  return data;
}

/** DELETE /api/streams/<pk> — soft-delete (sets is_active=false). */
export async function deleteStream(pk: number): Promise<Stream> {
  const { data } = await apiDelete<Stream>(`/api/streams/${pk}`);
  return data;
}
