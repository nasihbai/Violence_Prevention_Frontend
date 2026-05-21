<script setup lang="ts">
import { onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useStreamsStore } from "@/stores/streams";
import { useAlertsStore } from "@/stores/alerts";
import { useStatsStore } from "@/stores/stats";
import { useSocket } from "@/composables/useSocket";
import { getApiUrl } from "@/services/api";
import CameraTile from "@/components/CameraTile.vue";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Severity } from "@/types/alerts";

const streamsStore = useStreamsStore();
const alertsStore = useAlertsStore();
const statsStore = useStatsStore();
const { activeStreams } = storeToRefs(streamsStore);
const { alerts } = storeToRefs(alertsStore);
const { stats } = storeToRefs(statsStore);

// Initializing the socket singleton activates the violence_alert +
// stats_update listeners (wired in useSocket) — the stores then stay live.
useSocket();

onMounted(() => {
  streamsStore.fetchStreams();
  alertsStore.fetchAlerts();
  statsStore.fetchStats();
});

// ---------- Live feed ----------
const videoFeedUrl = computed(() => `${getApiUrl()}/video_feed`);
const primaryCamera = computed(() => activeStreams.value[0] ?? null);

// ---------- Ticker ----------
const recentAlerts = computed(() => alerts.value.slice(0, 8));

const severityColor: Record<Severity, string> = {
  low: "bg-slate-200 text-slate-900 hover:bg-slate-200",
  medium: "bg-amber-200 text-amber-900 hover:bg-amber-200",
  high: "bg-orange-300 text-orange-950 hover:bg-orange-300",
  critical: "bg-red-400 text-red-950 hover:bg-red-400",
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}

// ---------- Stat cards ----------
const statCards = computed(() => [
  { label: "FPS", value: stats.value.current_fps.toFixed(1) },
  { label: "Frames processed", value: stats.value.total_frames.toLocaleString() },
  { label: "Violence detections", value: stats.value.violence_detections.toLocaleString() },
  { label: "Alerts triggered", value: stats.value.alerts_triggered.toLocaleString() },
]);
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Live Monitoring</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Real-time detector feed, stats, and incoming alerts.
        </p>
      </div>
      <Badge :variant="stats.is_running ? 'default' : 'secondary'" class="gap-1">
        <span
          class="inline-block w-2 h-2 rounded-full"
          :class="stats.is_running ? 'bg-green-500' : 'bg-zinc-400'"
        />
        {{ stats.is_running ? "Detector running" : "Detector stopped" }}
      </Badge>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Live feed -->
      <Card class="lg:col-span-2">
        <CardHeader>
          <CardTitle>Camera feed</CardTitle>
          <CardDescription>
            {{ primaryCamera ? `${primaryCamera.name} (${primaryCamera.stream_id})` : "No active camera" }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CameraTile
            v-if="primaryCamera"
            :name="primaryCamera.name"
            :stream-id="primaryCamera.stream_id"
            :location="primaryCamera.location ?? ''"
            :online="true"
            :feed-url="videoFeedUrl"
          />
          <div
            v-else
            class="aspect-video rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground"
          >
            No active camera — add one under Cameras.
          </div>
        </CardContent>
      </Card>

      <!-- Stats + uptime -->
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <Card v-for="card in statCards" :key="card.label">
            <CardHeader class="pb-2">
              <CardDescription>{{ card.label }}</CardDescription>
              <CardTitle class="text-2xl">{{ card.value }}</CardTitle>
            </CardHeader>
          </Card>
        </div>
        <Card>
          <CardHeader class="pb-2">
            <CardDescription>Uptime</CardDescription>
            <CardTitle class="text-2xl">{{ stats.uptime || "—" }}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>

    <!-- Live alert ticker -->
    <Card>
      <CardHeader>
        <CardTitle>Live alerts</CardTitle>
        <CardDescription>Most recent detections — updates in real time.</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="recentAlerts.length === 0" class="py-8 text-center text-sm text-muted-foreground">
          No alerts yet.
        </div>
        <div v-else class="divide-y">
          <div
            v-for="alert in recentAlerts"
            :key="alert.id"
            class="py-3 flex items-center gap-3"
          >
            <Badge v-if="alert.severity" :class="severityColor[alert.severity]">
              {{ alert.severity }}
            </Badge>
            <Badge variant="outline">{{ alert.type }}</Badge>
            <span class="text-sm text-muted-foreground">Camera {{ alert.camera_id || "—" }}</span>
            <span class="text-sm ml-auto tabular-nums">{{ formatTime(alert.timestamp) }}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
