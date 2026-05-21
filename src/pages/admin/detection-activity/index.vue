<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useStatsStore } from "@/stores/stats";
import { useSocket } from "@/composables/useSocket";
import { listDetectionLogs, type DetectionLog } from "@/services/detection.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-vue-next";

const statsStore = useStatsStore();
const { stats } = storeToRefs(statsStore);

// Socket singleton keeps the stats store live via 'stats_update'.
useSocket();

const logs = ref<DetectionLog[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

async function loadLogs() {
  loading.value = true;
  error.value = null;
  try {
    const res = await listDetectionLogs({ limit: 100 });
    logs.value = Array.isArray(res?.items) ? res.items : [];
  } catch (e: any) {
    error.value = e?.data?.errors?._?.[0] || e?.message || "Failed to load detection logs";
    logs.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  statsStore.fetchStats();
  loadLogs();
});

// ---------- Detector status cards ----------
const statusCards = computed(() => [
  { label: "Current FPS", value: stats.value.current_fps.toFixed(1) },
  { label: "Frames processed", value: stats.value.total_frames.toLocaleString() },
  { label: "Uptime", value: stats.value.uptime || "—" },
  { label: "Log rows", value: logs.value.length.toLocaleString() },
]);

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Detection Activity</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Detector health and the raw per-frame detection log.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Badge :variant="stats.is_running ? 'default' : 'secondary'" class="gap-1">
          <span
            class="inline-block w-2 h-2 rounded-full"
            :class="stats.is_running ? 'bg-green-500' : 'bg-zinc-400'"
          />
          {{ stats.is_running ? "Detector running" : "Detector stopped" }}
        </Badge>
        <Button variant="outline" size="sm" :disabled="loading" @click="loadLogs">Refresh</Button>
      </div>
    </div>

    <!-- Status cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card v-for="card in statusCards" :key="card.label">
        <CardHeader class="pb-2">
          <CardDescription>{{ card.label }}</CardDescription>
          <CardTitle class="text-2xl">{{ card.value }}</CardTitle>
        </CardHeader>
      </Card>
    </div>

    <!-- Detection log table -->
    <Card>
      <CardHeader>
        <CardTitle>Detection log</CardTitle>
        <CardDescription>
          One row per ~30 processed frames — person count and processing time per camera.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="error && logs.length === 0" class="py-6 text-center text-sm text-destructive">
          {{ error }}
        </div>

        <div v-else-if="loading && logs.length === 0" class="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>

        <div v-else-if="logs.length === 0" class="py-12 text-center">
          <div class="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Activity class="w-6 h-6 text-muted-foreground" />
          </div>
          <p class="text-sm font-medium">No detection logs yet</p>
          <p class="text-sm text-muted-foreground mt-1">
            Rows appear once the detector is running and processing frames.
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-muted-foreground">
                <th class="py-2 pr-4 font-medium">Time</th>
                <th class="py-2 pr-4 font-medium">Camera</th>
                <th class="py-2 pr-4 font-medium">Persons</th>
                <th class="py-2 pr-4 font-medium">Processing (ms)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in logs" :key="log.id" class="border-b last:border-0">
                <td class="py-2 pr-4 tabular-nums">{{ formatTime(log.timestamp) }}</td>
                <td class="py-2 pr-4 font-mono">{{ log.stream_id }}</td>
                <td class="py-2 pr-4 tabular-nums">{{ log.person_count ?? 0 }}</td>
                <td class="py-2 pr-4 tabular-nums">
                  {{ log.processing_time_ms != null ? log.processing_time_ms.toFixed(1) : "—" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
