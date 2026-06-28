<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useStreamsStore } from "@/stores/streams";
import { useAlertsStore } from "@/stores/alerts";
import { useStatsStore } from "@/stores/stats";
import { useSocket } from "@/composables/useSocket";
import { getApiUrl } from "@/services/api";
import CameraTile from "@/components/CameraTile.vue";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Video } from "lucide-vue-next";
import { severityBadgeClass } from "@/lib/incident-styles";
import type { Alert } from "@/types/alerts";

const streamsStore = useStreamsStore();
const alertsStore = useAlertsStore();
const statsStore = useStatsStore();
const { streams, activeStreams } = storeToRefs(streamsStore);
const { alerts } = storeToRefs(alertsStore);
const { stats } = storeToRefs(statsStore);

// Camera tiles flash red for 5s when a live SocketIO alert fires, then go calm.
// This is separate from the historical alerts store so old DB records don't
// permanently keep the banner on.
const flashingCameraIds = ref<Set<string>>(new Set());

function flashCamera(alert: Alert) {
  if (!alert.camera_id) return;
  flashingCameraIds.value = new Set([...flashingCameraIds.value, alert.camera_id]);
  setTimeout(() => {
    const next = new Set(flashingCameraIds.value);
    next.delete(alert.camera_id!);
    flashingCameraIds.value = next;
  }, 5000);
}

const socket = useSocket();

onMounted(() => {
  streamsStore.fetchStreams();
  alertsStore.fetchAlerts();
  statsStore.fetchStats();

  // Wire live flash directly off the SocketIO event, not the DB store.
  socket.on("violence_alert", flashCamera);
});

onUnmounted(() => {
  socket.off("violence_alert", flashCamera);
});

// ---------- Demo fallback data (offline preview, no backend) ----------
interface CameraView {
  key: string;
  name: string;
  location: string;
  streamId: string;
  feedUrl: string;
  online: boolean;
}

const DEMO_CAMERAS: CameraView[] = [
  { key: "d1", name: "Front Door", location: "Main Entrance", streamId: "CAM_01", feedUrl: "", online: true },
  { key: "d2", name: "Lobby", location: "Ground Floor", streamId: "CAM_02", feedUrl: "", online: true },
  { key: "d3", name: "Garage", location: "Basement B1", streamId: "CAM_03", feedUrl: "", online: true },
  { key: "d4", name: "Warehouse", location: "Block C", streamId: "CAM_04", feedUrl: "", online: true },
  { key: "d5", name: "Parking", location: "Outdoor Lot", streamId: "CAM_05", feedUrl: "", online: false },
  { key: "d6", name: "Reception", location: "Level 2", streamId: "CAM_06", feedUrl: "", online: true },
];

// ---------- Derived view data ----------
// Use real streams when the backend has returned any; otherwise fall back to
// demo cameras so the grid is never empty during offline preview.
const usingDemo = computed(() => streams.value.length === 0);

const cameras = computed<CameraView[]>(() => {
  if (usingDemo.value) return DEMO_CAMERAS;
  // The backend runs a single detector against one source at a time.
  // Only the first active stream gets the live feed; the rest show as offline
  // until per-stream detection is implemented (Phase 4.5).
  return activeStreams.value.map((s, i) => ({
    key: String(s.id),
    name: s.name,
    location: s.location ?? "",
    streamId: s.stream_id,
    feedUrl: i === 0 ? `${getApiUrl()}/video_feed` : "",
    online: i === 0,
  }));
});

const panelAlerts = computed<Alert[]>(() => alerts.value.slice(0, 12));

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString([], {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

// Map a camera_id (stream code) back to its human name for the alert title.
const cameraNameById = computed(() => {
  const m = new Map<string, string>();
  for (const c of cameras.value) m.set(c.streamId, c.name);
  return m;
});

function cameraName(id: string | null): string {
  if (!id) return "Unknown camera";
  return cameraNameById.value.get(id) ?? `Camera ${id}`;
}

const typeLabel: Record<Alert["type"], string> = {
  violent: "Violence Detected",
  threatening: "Threatening Behavior",
};
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="type-page-title text-foreground">Surveillance Dashboard</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Live camera feeds and real-time violence detection alerts.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Badge v-if="usingDemo" variant="outline" class="gap-1">Demo data</Badge>
        <Badge variant="secondary" class="gap-1">
          {{ cameras.length }} cameras
        </Badge>
        <Badge :variant="stats.is_running ? 'default' : 'secondary'" class="gap-1">
          <span
            class="inline-block w-2 h-2 rounded-full"
            :class="stats.is_running ? 'bg-success' : 'bg-muted-foreground'"
          />
          {{ stats.is_running ? "Detector running" : "Detector stopped" }}
        </Badge>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-4 gap-4">
      <!-- Camera grid -->
      <div class="xl:col-span-3">
        <div class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
          <CameraTile
            v-for="cam in cameras"
            :key="cam.key"
            :name="cam.name"
            :location="cam.location"
            :stream-id="cam.streamId"
            :feed-url="cam.feedUrl"
            :online="cam.online"
            :recent-alert="flashingCameraIds.has(cam.streamId)"
          />
        </div>
      </div>

      <!-- Alert panel -->
      <Card class="xl:col-span-1 self-start">
        <CardHeader class="pb-3">
          <CardTitle class="flex items-center gap-2 text-base">
            <Bell class="h-4 w-4" />
            Alert Panel
          </CardTitle>
          <CardDescription>Most recent detections — updates in real time.</CardDescription>
        </CardHeader>
        <CardContent class="p-0">
          <div
            v-if="panelAlerts.length === 0"
            class="py-10 text-center text-sm text-muted-foreground"
          >
            No alerts.
          </div>
          <div v-else class="max-h-[78vh] overflow-y-auto divide-y">
            <div
              v-for="alert in panelAlerts"
              :key="alert.id"
              class="px-4 py-3 flex flex-col gap-2 hover:bg-muted/50 transition-colors"
            >
              <!-- Title: camera name + status dot -->
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-semibold text-primary truncate">
                  {{ cameraName(alert.camera_id) }}
                </span>
                <span class="inline-block w-2 h-2 rounded-full bg-primary shrink-0" />
              </div>

              <!-- Date + time -->
              <div class="text-xs text-muted-foreground tabular-nums">
                {{ formatDateTime(alert.timestamp) }}
              </div>

              <!-- Camera-feed thumbnail with overlays -->
              <div
                class="relative aspect-video rounded-md overflow-hidden border"
                :class="alert.severity === 'critical' ? 'border-red-500' : 'border-zinc-800'"
              >
                <div
                  class="absolute inset-0 flex items-center justify-center text-zinc-500"
                  :style="{
                    background:
                      'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.05) 0%, transparent 50%), linear-gradient(135deg, #18181b 0%, #27272a 100%)',
                  }"
                >
                  <Video class="w-8 h-8" />
                </div>
                <!-- Recording indicator -->
                <span
                  class="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-500/40 animate-pulse"
                />
                <!-- Time badge -->
                <span
                  class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono tabular-nums"
                >
                  {{ formatTime(alert.timestamp) }}
                </span>
              </div>

              <!-- Footer: severity + detection label -->
              <div class="flex items-center gap-2">
                <Badge v-if="alert.severity" :class="severityBadgeClass(alert.severity)">
                  {{ alert.severity }}
                </Badge>
                <span class="text-sm text-muted-foreground">{{ typeLabel[alert.type] }}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
