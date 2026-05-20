<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { toast } from "vue-sonner";
import { useAlertsStore } from "@/stores/alerts";
import { useSocket, disconnectSocket } from "@/composables/useSocket";
import { fireTestAlert } from "@/services/alerts.service";
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
import type { Severity, IncidentStatus } from "@/types/alerts";

const alertsStore = useAlertsStore();
const { alerts, total, loading, error, filters, pagination, unacknowledgedCount } =
  storeToRefs(alertsStore);

// SocketIO listener is wired inside the composable; calling useSocket() is
// enough to initialize the singleton connection.
const socket = useSocket();
const socketConnected = ref(socket.connected);
socket.on("connect", () => (socketConnected.value = true));
socket.on("disconnect", () => (socketConnected.value = false));

onMounted(() => {
  alertsStore.fetchAlerts();
});

onBeforeUnmount(() => {
  // We don't disconnect the singleton here — other pages may still want
  // realtime alerts. Disconnect on full app teardown / logout instead.
});

// ---------- UI helpers ----------

const severityColor: Record<Severity, string> = {
  low: "bg-slate-200 text-slate-900 hover:bg-slate-200",
  medium: "bg-amber-200 text-amber-900 hover:bg-amber-200",
  high: "bg-orange-300 text-orange-950 hover:bg-orange-300",
  critical: "bg-red-400 text-red-950 hover:bg-red-400",
};

const statusOptions: { label: string; value: IncidentStatus | "" }[] = [
  { label: "All statuses", value: "" },
  { label: "Open", value: "open" },
  { label: "Investigating", value: "investigating" },
  { label: "Resolved", value: "resolved" },
  { label: "False positive", value: "false_positive" },
];

const severityOptions: { label: string; value: Severity | "" }[] = [
  { label: "All severities", value: "" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
];

const acknowledgedOptions: { label: string; value: "" | "true" | "false" }[] = [
  { label: "All", value: "" },
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
  alertsStore.setFilter("status", (v || undefined) as IncidentStatus | undefined);
  alertsStore.fetchAlerts();
}
function setSeverity(v: string) {
  alertsStore.setFilter("severity", (v || undefined) as Severity | undefined);
  alertsStore.fetchAlerts();
}
function setAcknowledged(v: string) {
  const value = v === "" ? undefined : v === "true";
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
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Alerts</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Live violence-detection alerts from connected cameras.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Badge :variant="socketConnected ? 'default' : 'secondary'" class="gap-1">
          <span
            class="inline-block w-2 h-2 rounded-full"
            :class="socketConnected ? 'bg-green-500' : 'bg-zinc-400'"
          />
          {{ socketConnected ? "Live" : "Disconnected" }}
        </Badge>
        <Button :disabled="firing" variant="outline" @click="onFireTest">
          Fire test alert
        </Button>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>Total (current filter)</CardDescription>
          <CardTitle class="text-3xl">{{ total }}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>Unacknowledged (on this page)</CardDescription>
          <CardTitle class="text-3xl">{{ unacknowledgedCount }}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>WebSocket</CardDescription>
          <CardTitle class="text-3xl">
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
            <Select :model-value="filters.status ?? ''" @update:model-value="setStatus">
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
            <Select :model-value="filters.severity ?? ''" @update:model-value="setSeverity">
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
              :model-value="filters.acknowledged === undefined ? '' : String(filters.acknowledged)"
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
        <div v-if="loading" class="text-sm text-muted-foreground py-6 text-center">
          Loading…
        </div>
        <div v-else-if="error" class="text-sm text-destructive py-6 text-center">
          {{ error }}
        </div>
        <div v-else-if="alerts.length === 0" class="text-sm text-muted-foreground py-12 text-center">
          No alerts match the current filters.
        </div>
        <div v-else class="divide-y">
          <div
            v-for="alert in alerts"
            :key="alert.id"
            class="py-4 flex items-center justify-between gap-4"
            :class="{ 'opacity-60': alert.dismissed }"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <Badge v-if="alert.severity" :class="severityColor[alert.severity]">
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
                @click="onAcknowledge(alert.id)"
              >
                Acknowledge
              </Button>
              <Button
                v-if="!alert.dismissed"
                size="sm"
                variant="outline"
                @click="onDismiss(alert.id)"
              >
                Dismiss
              </Button>
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
