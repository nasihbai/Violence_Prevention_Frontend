<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { toast } from "vue-sonner";
import { useAlertsStore } from "@/stores/alerts";
import { useStreamsStore } from "@/stores/streams";
import { useSocket } from "@/composables/useSocket";
import { fireTestAlert } from "@/services/alerts.service";
import { getApiUrl } from "@/services/api";
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
import { Inbox } from "lucide-vue-next";
import CameraTile from "@/components/CameraTile.vue";
import { severityBadgeClass } from "@/lib/incident-styles";
import type { Alert, Severity, IncidentStatus } from "@/types/alerts";

const router = useRouter();
const alertsStore = useAlertsStore();
const streamsStore = useStreamsStore();
const { alerts, total, loading, error, filters, pagination, unacknowledgedCount } =
  storeToRefs(alertsStore);
const { activeStreams } = storeToRefs(streamsStore);

function openIncident(incidentId: number) {
  router.push({ name: "admin-incident-detail", params: { id: incidentId } });
}

// SocketIO singleton; calling useSocket() initializes it if needed.
const socket = useSocket();
const socketConnected = ref(socket.connected);

// Named handlers so we can unregister on unmount — registering anonymous
// listeners on the singleton inside setup() leaks one handler per route
// navigation, which compounds into UI lag after a few mounts.
function onSocketConnect() {
  socketConnected.value = true;
}
function onSocketDisconnect() {
  socketConnected.value = false;
}

onMounted(() => {
  socket.on("connect", onSocketConnect);
  socket.on("disconnect", onSocketDisconnect);
  socket.on("violence_alert", flashCameraForAlert);
  alertsStore.fetchAlerts();
  streamsStore.fetchStreams();
});

onBeforeUnmount(() => {
  socket.off("connect", onSocketConnect);
  socket.off("disconnect", onSocketDisconnect);
  socket.off("violence_alert", flashCameraForAlert);
  // Don't disconnect the singleton — other pages may want live alerts.
  // Teardown happens on full app exit / logout.
});

// ---------- UI helpers ----------

// Radix/reka Select rejects empty-string values — they're reserved to mean
// "no selection". Use a sentinel ("all") instead and translate to undefined
// in the setX handlers below.
const ALL = "all" as const;

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

const acknowledgedOptions: { label: string; value: typeof ALL | "true" | "false" }[] = [
  { label: "All", value: ALL },
  { label: "Unacknowledged", value: "false" },
  { label: "Acknowledged", value: "true" },
];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

// ---------- Filter handlers ----------

function setStatus(v: string) {
  const value = v === ALL ? undefined : (v as IncidentStatus);
  alertsStore.setFilter("status", value);
  alertsStore.fetchAlerts();
}
function setSeverity(v: string) {
  const value = v === ALL ? undefined : (v as Severity);
  alertsStore.setFilter("severity", value);
  alertsStore.fetchAlerts();
}
function setAcknowledged(v: string) {
  const value = v === ALL ? undefined : v === "true";
  alertsStore.setFilter("acknowledged", value);
  alertsStore.fetchAlerts();
}

// ---------- Pagination ----------

const hasNext = computed(
  () => pagination.value.offset + pagination.value.limit < total.value,
);
const hasPrev = computed(() => pagination.value.offset > 0);

function nextPage() {
  pagination.value.offset += pagination.value.limit;
  alertsStore.fetchAlerts();
}
function prevPage() {
  pagination.value.offset = Math.max(0, pagination.value.offset - pagination.value.limit);
  alertsStore.fetchAlerts();
}

// ---------- Row actions ----------

async function onAcknowledge(id: number) {
  try {
    await alertsStore.acknowledge(id);
    toast.success("Alert acknowledged");
  } catch {
    toast.error("Failed to acknowledge");
  }
}

async function onDismiss(id: number) {
  try {
    await alertsStore.dismiss(id);
    toast.success("Alert dismissed");
  } catch {
    toast.error("Failed to dismiss");
  }
}

// ---------- Test fire (dev only) ----------

const firing = ref(false);
const seedingBatch = ref(false);

async function onFireTest() {
  firing.value = true;
  try {
    await fireTestAlert({ severity: "high" });
    toast.success("Test alert fired");
  } catch (e: any) {
    toast.error(e?.data?.errors?._?.[0] || "Failed to fire test alert");
  } finally {
    firing.value = false;
  }
}

/** Spam-fire 5 alerts so an empty list becomes populated quickly. */
async function onSeedFive() {
  seedingBatch.value = true;
  const severities: Severity[] = ["low", "medium", "high", "critical", "high"];
  try {
    for (const severity of severities) {
      await fireTestAlert({ severity });
    }
    toast.success("5 demo alerts fired");
    await alertsStore.fetchAlerts();
  } catch (e: any) {
    toast.error(e?.data?.errors?._?.[0] || "Seeding failed midway");
  } finally {
    seedingBatch.value = false;
  }
}

// ---------- Camera tiles ----------
// Tiles render from the real streams store (active streams only).
//
// The BE exposes ONE global MJPEG feed at /video_feed (the source the
// detector was started with). Until Phase 4.5 adds per-stream feeds, we
// designate the FIRST active camera as the "live" tile and point it at
// /video_feed; the rest stay offline placeholders. The `recentAlert`
// flag is derived from the live alert stream: any alert in the last 5s
// for a given camera_id flashes its tile.
const recentAlertCameras = ref<Set<string>>(new Set());

/** The single MJPEG endpoint the running detector serves. */
const videoFeedUrl = computed(() => `${getApiUrl()}/video_feed`);

/** First active camera is treated as the one the detector is monitoring. */
const liveStreamId = computed(() => activeStreams.value[0]?.stream_id ?? null);

function isCameraFlashing(streamId: string): boolean {
  return recentAlertCameras.value.has(streamId);
}

function flashCameraForAlert(alert: Alert) {
  if (!alert.camera_id) return;
  recentAlertCameras.value.add(alert.camera_id);
  // Auto-clear the flash after 5s so the tile returns to its calm state.
  setTimeout(() => {
    const next = new Set(recentAlertCameras.value);
    next.delete(alert.camera_id!);
    recentAlertCameras.value = next;
  }, 5000);
}

</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="type-page-title text-foreground">Alerts</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Live violence-detection alerts from connected cameras.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Badge :variant="socketConnected ? 'default' : 'secondary'" class="gap-1">
          <span
            class="inline-block w-2 h-2 rounded-full"
            :class="socketConnected ? 'bg-success' : 'bg-muted-foreground'"
          />
          {{ socketConnected ? "Live" : "Disconnected" }}
        </Badge>
        <Button :disabled="firing" variant="outline" @click="onFireTest">
          Fire test alert
        </Button>
      </div>
    </div>

    <!-- Camera tiles (live feed wires in Phase 4.5) -->
    <Card>
      <CardHeader>
        <CardTitle>Live cameras</CardTitle>
        <CardDescription>
          The primary camera shows the live detector feed. Real-time alerts
          flash the corresponding tile. Per-camera feeds arrive with the
          multi-camera grid.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          v-if="activeStreams.length === 0"
          class="py-8 text-center text-sm text-muted-foreground"
        >
          No active cameras.
          <RouterLink to="/admin/streams" class="underline underline-offset-2">
            Add one
          </RouterLink>
          to start monitoring.
        </div>
        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <CameraTile
            v-for="cam in activeStreams"
            :key="cam.id"
            :name="cam.name"
            :stream-id="cam.stream_id"
            :location="cam.location ?? ''"
            :online="cam.stream_id === liveStreamId"
            :feed-url="cam.stream_id === liveStreamId ? videoFeedUrl : ''"
            :recent-alert="isCameraFlashing(cam.stream_id)"
          />
        </div>
      </CardContent>
    </Card>

    <!-- Summary cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>Total (current filter)</CardDescription>
          <CardTitle class="type-metric-md text-foreground">{{ total }}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>Unacknowledged (on this page)</CardDescription>
          <CardTitle class="type-metric-md text-foreground">{{ unacknowledgedCount }}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>WebSocket</CardDescription>
          <CardTitle class="type-metric-md text-foreground">
            {{ socketConnected ? "Connected" : "—" }}
          </CardTitle>
        </CardHeader>
      </Card>
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
          <div class="min-w-[180px]">
            <Select
              :model-value="filters.acknowledged === undefined ? ALL : String(filters.acknowledged)"
              @update:model-value="setAcknowledged"
            >
              <SelectTrigger>
                <SelectValue placeholder="Acknowledged" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in acknowledgedOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" @click="alertsStore.clearFilters(); alertsStore.fetchAlerts()">
            Clear filters
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- List -->
    <Card>
      <CardHeader>
        <CardTitle>Alert history</CardTitle>
        <CardDescription>
          Most recent first. Acknowledged + dismissed actions update the BE in real time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <!-- Error: only shown when there's no fallback data to display -->
        <div
          v-if="error && alerts.length === 0"
          class="text-sm text-destructive py-6 text-center"
        >
          {{ error }}
        </div>

        <!-- Initial load (loading + no data yet): skeleton rows -->
        <div v-else-if="loading && alerts.length === 0" class="divide-y">
          <div
            v-for="n in 3"
            :key="`skeleton-${n}`"
            class="py-4 flex items-center justify-between gap-4 animate-pulse"
          >
            <div class="min-w-0 flex-1 space-y-2">
              <div class="flex gap-2">
                <div class="h-5 w-16 rounded bg-muted" />
                <div class="h-5 w-20 rounded bg-muted" />
                <div class="h-5 w-24 rounded bg-muted" />
              </div>
              <div class="h-4 w-1/3 rounded bg-muted" />
            </div>
            <div class="flex gap-2 shrink-0">
              <div class="h-8 w-24 rounded bg-muted" />
              <div class="h-8 w-20 rounded bg-muted" />
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-else-if="alerts.length === 0"
          class="py-12 text-center"
        >
          <div class="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Inbox class="w-6 h-6 text-muted-foreground" />
          </div>
          <p class="text-sm font-medium">No alerts to show</p>
          <p class="text-sm text-muted-foreground mt-1 mb-4">
            Either nothing matches the current filters, or no alerts have been recorded yet.
          </p>
          <div class="flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="default"
              :disabled="seedingBatch"
              @click="onSeedFive"
            >
              {{ seedingBatch ? "Seeding…" : "Fire 5 demo alerts" }}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              @click="alertsStore.clearFilters(); alertsStore.fetchAlerts()"
            >
              Clear filters
            </Button>
          </div>
        </div>

        <!-- Actual list -->
        <div v-else class="divide-y">
          <div
            v-for="alert in alerts"
            :key="alert.id"
            class="py-4 flex items-center justify-between gap-4 cursor-pointer rounded-md transition-colors hover:bg-muted/50 px-2 -mx-2"
            :class="{ 'opacity-60': alert.dismissed }"
            role="link"
            tabindex="0"
            :title="`Open incident #${alert.incident_id}`"
            @click="openIncident(alert.incident_id)"
            @keydown.enter="openIncident(alert.incident_id)"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <Badge v-if="alert.severity" :class="severityBadgeClass(alert.severity)">
                  {{ alert.severity }}
                </Badge>
                <Badge variant="outline">{{ alert.type }}</Badge>
                <Badge v-if="alert.acknowledged" variant="secondary">acknowledged</Badge>
                <Badge v-if="alert.dismissed" variant="secondary">dismissed</Badge>
                <span class="text-sm text-muted-foreground">
                  Camera {{ alert.camera_id || "—" }}
                </span>
              </div>
              <div class="mt-1 text-sm">
                <span class="font-medium">{{ formatTime(alert.timestamp) }}</span>
                <span class="text-muted-foreground">
                  · confidence {{ (alert.confidence * 100).toFixed(1) }}%
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <Button
                v-if="!alert.acknowledged"
                size="sm"
                variant="default"
                @click.stop="onAcknowledge(alert.id)"
              >
                Acknowledge
              </Button>
              <Button
                v-if="!alert.dismissed"
                size="sm"
                variant="outline"
                @click.stop="onDismiss(alert.id)"
              >
                Dismiss
              </Button>
              <span
                v-if="alert.acknowledged && alert.dismissed"
                class="text-xs text-muted-foreground italic"
              >
                no actions
              </span>
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
