<script setup lang="ts">
import { onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useIncidentsStore } from "@/stores/incidents";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList } from "lucide-vue-next";
import type { Severity, IncidentStatus } from "@/types/alerts";

const router = useRouter();
const incidentsStore = useIncidentsStore();
const { incidents, total, loading, error, filters, pagination } = storeToRefs(incidentsStore);

onMounted(() => {
  incidentsStore.fetchIncidents();
});

function openIncident(id: number) {
  router.push({ name: "admin-incident-detail", params: { id } });
}

// ---------- UI maps ----------

const ALL = "all" as const;

const severityColor: Record<Severity, string> = {
  low: "bg-slate-200 text-slate-900 hover:bg-slate-200",
  medium: "bg-amber-200 text-amber-900 hover:bg-amber-200",
  high: "bg-orange-300 text-orange-950 hover:bg-orange-300",
  critical: "bg-red-400 text-red-950 hover:bg-red-400",
};

const statusColor: Record<IncidentStatus, string> = {
  open: "bg-red-100 text-red-900 hover:bg-red-100",
  investigating: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  resolved: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
  false_positive: "bg-slate-200 text-slate-700 hover:bg-slate-200",
};

const statusOptions: { label: string; value: IncidentStatus | typeof ALL }[] = [
  { label: "All statuses", value: ALL },
  { label: "Open", value: "open" },
  { label: "Investigating", value: "investigating" },
  { label: "Resolved", value: "resolved" },
  { label: "False positive", value: "false_positive" },
];

const severityOptions: { label: string; value: Severity | typeof ALL }[] = [
  { label: "All severities", value: ALL },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

// ---------- Filters ----------

function setStatus(v: string) {
  incidentsStore.setFilter("status", v === ALL ? undefined : (v as IncidentStatus));
  incidentsStore.fetchIncidents();
}
function setSeverity(v: string) {
  incidentsStore.setFilter("severity", v === ALL ? undefined : (v as Severity));
  incidentsStore.fetchIncidents();
}

// ---------- Pagination ----------

const hasNext = computed(
  () => pagination.value.offset + pagination.value.limit < total.value,
);
const hasPrev = computed(() => pagination.value.offset > 0);

function nextPage() {
  pagination.value.offset += pagination.value.limit;
  incidentsStore.fetchIncidents();
}
function prevPage() {
  pagination.value.offset = Math.max(0, pagination.value.offset - pagination.value.limit);
  incidentsStore.fetchIncidents();
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Incidents</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Every violence/threat event the detector has flagged. Click a row for the full report.
      </p>
    </div>

    <!-- Filters -->
    <Card>
      <CardContent class="pt-6">
        <div class="flex flex-wrap gap-3">
          <div class="min-w-[180px]">
            <Select :model-value="filters.status ?? ALL" @update:model-value="setStatus">
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="min-w-[180px]">
            <Select :model-value="filters.severity ?? ALL" @update:model-value="setSeverity">
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in severityOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            @click="incidentsStore.clearFilters(); incidentsStore.fetchIncidents()"
          >
            Clear filters
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- List -->
    <Card>
      <CardHeader>
        <CardTitle>Incident history</CardTitle>
        <CardDescription>Most recent first. {{ total }} total.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          v-if="error && incidents.length === 0"
          class="py-6 text-center text-sm text-destructive"
        >
          {{ error }}
        </div>

        <!-- Loading skeleton -->
        <div v-else-if="loading && incidents.length === 0" class="divide-y">
          <div
            v-for="n in 3"
            :key="`sk-${n}`"
            class="py-4 flex items-center gap-4 animate-pulse"
          >
            <div class="flex-1 space-y-2">
              <div class="flex gap-2">
                <div class="h-5 w-28 rounded bg-muted" />
                <div class="h-5 w-16 rounded bg-muted" />
                <div class="h-5 w-20 rounded bg-muted" />
              </div>
              <div class="h-4 w-1/3 rounded bg-muted" />
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div v-else-if="incidents.length === 0" class="py-12 text-center">
          <div class="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <ClipboardList class="w-6 h-6 text-muted-foreground" />
          </div>
          <p class="text-sm font-medium">No incidents to show</p>
          <p class="text-sm text-muted-foreground mt-1">
            Nothing matches the current filters, or no incidents have been recorded yet.
          </p>
        </div>

        <!-- Rows -->
        <div v-else class="divide-y">
          <div
            v-for="incident in incidents"
            :key="incident.id"
            class="py-4 flex items-center justify-between gap-4 cursor-pointer rounded-md transition-colors hover:bg-muted/50 px-2 -mx-2"
            role="link"
            tabindex="0"
            :title="`Open ${incident.incident_code}`"
            @click="openIncident(incident.id)"
            @keydown.enter="openIncident(incident.id)"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono text-sm font-medium">{{ incident.incident_code }}</span>
                <Badge :class="severityColor[incident.severity]">{{ incident.severity }}</Badge>
                <Badge variant="outline">{{ incident.type }}</Badge>
                <Badge :class="statusColor[incident.status]">
                  {{ incident.status.replace("_", " ") }}
                </Badge>
              </div>
              <div class="mt-1 text-sm text-muted-foreground">
                Camera {{ incident.stream_id }}
                · {{ formatTime(incident.timestamp) }}
                · confidence {{ (incident.confidence * 100).toFixed(1) }}%
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Pagination -->
    <div v-if="total > pagination.limit" class="flex items-center justify-between text-sm">
      <span class="text-muted-foreground">
        Showing {{ pagination.offset + 1 }}–{{ Math.min(pagination.offset + pagination.limit, total) }}
        of {{ total }}
      </span>
      <div class="flex gap-2">
        <Button size="sm" variant="outline" :disabled="!hasPrev || loading" @click="prevPage">
          Previous
        </Button>
        <Button size="sm" variant="outline" :disabled="!hasNext || loading" @click="nextPage">
          Next
        </Button>
      </div>
    </div>
  </div>
</template>
