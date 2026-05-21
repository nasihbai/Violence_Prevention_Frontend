<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { getIncidentAnalytics, type IncidentAnalytics } from "@/services/analytics.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/ui/chart-bar";
import { DonutChart } from "@/components/ui/chart-donut";
import { BarChart3 } from "lucide-vue-next";

const analytics = ref<IncidentAnalytics | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    analytics.value = await getIncidentAnalytics();
  } catch (e: any) {
    error.value = e?.data?.errors?._?.[0] || e?.message || "Failed to load analytics";
    analytics.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

// ---------- Derived chart data ----------

/** by_severity / by_status object → [{ name, value }], zero slices dropped. */
function toSlices(obj: Record<string, number> | undefined) {
  if (!obj) return [];
  return Object.entries(obj)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: name.replace("_", " "), value }));
}

const severitySlices = computed(() => toSlices(analytics.value?.by_severity));
const statusSlices = computed(() => toSlices(analytics.value?.by_status));
const byDay = computed(() => analytics.value?.by_day ?? []);
const byCamera = computed(() => analytics.value?.by_camera ?? []);

const summary = computed(() => {
  const a = analytics.value;
  if (!a) return [];
  return [
    { label: "Total incidents", value: a.total },
    { label: "Open", value: a.by_status.open },
    { label: "Investigating", value: a.by_status.investigating },
    { label: "Resolved", value: a.by_status.resolved },
  ];
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Incident Analytics</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Trends across all recorded violence/threat incidents.
        </p>
      </div>
      <Button variant="outline" size="sm" :disabled="loading" @click="load">Refresh</Button>
    </div>

    <!-- Error -->
    <Card v-if="error && !analytics">
      <CardContent class="py-8 text-center space-y-2">
        <p class="text-sm font-medium text-destructive">{{ error }}</p>
        <Button variant="outline" size="sm" @click="load">Try again</Button>
      </CardContent>
    </Card>

    <!-- Loading -->
    <Card v-else-if="loading && !analytics">
      <CardContent class="py-12 text-center text-sm text-muted-foreground">Loading…</CardContent>
    </Card>

    <!-- Empty -->
    <Card v-else-if="analytics && analytics.total === 0">
      <CardContent class="py-12 text-center">
        <div class="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <BarChart3 class="w-6 h-6 text-muted-foreground" />
        </div>
        <p class="text-sm font-medium">No incidents recorded yet</p>
        <p class="text-sm text-muted-foreground mt-1">
          Charts will populate once the detector logs its first incidents.
        </p>
      </CardContent>
    </Card>

    <template v-else-if="analytics">
      <!-- Summary cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card v-for="card in summary" :key="card.label">
          <CardHeader class="pb-2">
            <CardDescription>{{ card.label }}</CardDescription>
            <CardTitle class="text-3xl">{{ card.value }}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <!-- Incidents over time -->
      <Card>
        <CardHeader>
          <CardTitle>Incidents over time</CardTitle>
          <CardDescription>Daily counts, last 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart
            v-if="byDay.length"
            class="h-72"
            :data="byDay"
            index="date"
            :categories="['count']"
            :rounded-corners="4"
          />
          <p v-else class="py-8 text-center text-sm text-muted-foreground">
            No incidents in the last 30 days.
          </p>
        </CardContent>
      </Card>

      <!-- Severity + per-camera -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>By severity</CardTitle>
            <CardDescription>Incident severity breakdown.</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              v-if="severitySlices.length"
              class="h-64"
              :data="severitySlices"
              index="name"
              category="value"
            />
            <p v-else class="py-8 text-center text-sm text-muted-foreground">No data.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By camera</CardTitle>
            <CardDescription>Incidents per camera.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              v-if="byCamera.length"
              class="h-64"
              :data="byCamera"
              index="stream_id"
              :categories="['count']"
              :rounded-corners="4"
            />
            <p v-else class="py-8 text-center text-sm text-muted-foreground">No data.</p>
          </CardContent>
        </Card>
      </div>

      <!-- Status breakdown -->
      <Card>
        <CardHeader>
          <CardTitle>By status</CardTitle>
          <CardDescription>Where incidents sit in the response workflow.</CardDescription>
        </CardHeader>
        <CardContent>
          <DonutChart
            v-if="statusSlices.length"
            class="h-64"
            :data="statusSlices"
            index="name"
            category="value"
          />
          <p v-else class="py-8 text-center text-sm text-muted-foreground">No data.</p>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
