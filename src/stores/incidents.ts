/**
 * Incidents store — list state + filters for the /admin/incidents page.
 *
 * The incident DETAIL page (pages/admin/incidents/[id].vue) calls the
 * service directly; this store backs the LIST page only.
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import { listIncidents as svcList } from "@/services/incidents.service";
import type { Incident, IncidentsQuery, IncidentStatus, Severity } from "@/types/alerts";

export const useIncidentsStore = defineStore("incidents", () => {
  // ----- State -----
  const incidents = ref<Incident[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const filters = ref<{ status?: IncidentStatus; severity?: Severity }>({});
  const pagination = ref({ limit: 50, offset: 0 });

  // ----- Actions -----

  /** Fetch incidents using the current filters + pagination. */
  async function fetchIncidents(extra: Partial<IncidentsQuery> = {}): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const query: IncidentsQuery = {
        ...filters.value,
        limit: pagination.value.limit,
        offset: pagination.value.offset,
        ...extra,
      };
      const res = await svcList(query);
      incidents.value = Array.isArray(res?.items) ? res.items : [];
      total.value = typeof res?.total === "number" ? res.total : incidents.value.length;
    } catch (e: any) {
      console.error("Failed to fetch incidents:", e);
      error.value = e?.data?.errors?._?.[0] || e?.message || "Failed to load incidents";
      incidents.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
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
    incidents,
    total,
    loading,
    error,
    filters,
    pagination,
    fetchIncidents,
    setFilter,
    clearFilters,
  };
});
