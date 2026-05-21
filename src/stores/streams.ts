/**
 * Streams store — the source of truth for the camera list.
 *
 * Consumed by:
 *  - /admin/streams management page (full CRUD)
 *  - /admin/alerts "Live cameras" tile grid (read-only, active streams)
 */
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  listStreams as svcList,
  createStream as svcCreate,
  updateStream as svcUpdate,
  deleteStream as svcDelete,
} from "@/services/streams.service";
import type { Stream, CreateStreamInput, UpdateStreamInput } from "@/types/streams";

export const useStreamsStore = defineStore("streams", () => {
  // ----- State -----
  const streams = ref<Stream[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ----- Getters -----
  const activeStreams = computed(() => streams.value.filter((s) => s.is_active));
  const activeCount = computed(() => activeStreams.value.length);

  // ----- Internal helpers -----
  function _upsert(updated: Stream) {
    const idx = streams.value.findIndex((s) => s.id === updated.id);
    if (idx === -1) {
      streams.value = [...streams.value, updated];
    } else {
      streams.value[idx] = updated;
    }
  }

  function _errMessage(e: any, fallback: string): string {
    return (
      e?.data?.errors?._?.[0] ||
      // first field-keyed error message, if any
      (e?.data?.errors && Object.values(e.data.errors)[0]?.[0]) ||
      e?.message ||
      fallback
    );
  }

  // ----- Actions -----

  /** Fetch all streams (both active and inactive). */
  async function fetchStreams(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const res = await svcList();
      streams.value = Array.isArray(res?.items) ? res.items : [];
    } catch (e: any) {
      console.error("Failed to fetch streams:", e);
      error.value = _errMessage(e, "Failed to load cameras");
      streams.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function create(input: CreateStreamInput): Promise<Stream> {
    try {
      const created = await svcCreate(input);
      _upsert(created);
      return created;
    } catch (e: any) {
      console.error("Failed to create stream:", e);
      throw new Error(_errMessage(e, "Failed to create camera"));
    }
  }

  async function update(pk: number, patch: UpdateStreamInput): Promise<Stream> {
    try {
      const updated = await svcUpdate(pk, patch);
      _upsert(updated);
      return updated;
    } catch (e: any) {
      console.error("Failed to update stream:", e);
      throw new Error(_errMessage(e, "Failed to update camera"));
    }
  }

  /** Soft-delete: the BE sets is_active=false and returns the row. */
  async function remove(pk: number): Promise<void> {
    try {
      const updated = await svcDelete(pk);
      _upsert(updated);
    } catch (e: any) {
      console.error("Failed to delete stream:", e);
      throw new Error(_errMessage(e, "Failed to delete camera"));
    }
  }

  return {
    // state
    streams,
    loading,
    error,
    // getters
    activeStreams,
    activeCount,
    // actions
    fetchStreams,
    create,
    update,
    remove,
  };
});
