<script setup lang="ts">
import { onMounted, computed, ref } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { toast } from "vue-sonner";
import { useIncidentsStore } from "@/stores/incidents";
import { updateIncident } from "@/services/incidents.service";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock3,
  Eye,
  Check,
  Trash2,
  ClipboardList,
} from "lucide-vue-next";
import type { Incident, IncidentStatus } from "@/types/alerts";

const router = useRouter();
const incidentsStore = useIncidentsStore();
const { incidents, total, loading, error } = storeToRefs(incidentsStore);

type InboxTab = "important" | "others" | "snoozed" | "activity";
type GroupMode = "camera" | "none";
type SortMode = "newest" | "oldest";

const activeTab = ref<InboxTab>("important");
const groupMode = ref<GroupMode>("camera");
const sortMode = ref<SortMode>("newest");
const collapsedGroups = ref<Set<string>>(new Set());
const actingId = ref<number | null>(null);
const markingAll = ref(false);

onMounted(() => {
  incidentsStore.pagination.limit = 100;
  incidentsStore.fetchIncidents();
});

function openIncident(id: number) {
  router.push({ name: "admin-incident-detail", params: { id } });
}

function formatTimeAgo(iso: string): string {
  try {
    const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diffSec < 60) return "just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return iso;
  }
}

function incidentTitle(incident: Incident): string {
  if (incident.type === "violent") return "Violence detected";
  if (incident.type === "threatening") return "Threatening behaviour flagged";
  return incident.incident_code;
}

function incidentDescription(incident: Incident): string {
  const confidence = `${(incident.confidence * 100).toFixed(1)}% confidence`;
  const location = incident.location ? ` · ${incident.location}` : "";
  return `${incident.severity} severity · ${confidence}${location}`;
}

function isUnread(incident: Incident): boolean {
  return incident.status === "open";
}

function tabMatches(incident: Incident, tab: InboxTab): boolean {
  switch (tab) {
    case "important":
      return incident.status === "open";
    case "others":
      return incident.status === "investigating";
    case "snoozed":
      return incident.status === "false_positive";
    case "activity":
      return incident.status === "resolved";
    default:
      return true;
  }
}

const tabCounts = computed(() => ({
  important: incidents.value.filter((i) => tabMatches(i, "important")).length,
  others: incidents.value.filter((i) => tabMatches(i, "others")).length,
  snoozed: incidents.value.filter((i) => tabMatches(i, "snoozed")).length,
  activity: incidents.value.filter((i) => tabMatches(i, "activity")).length,
}));

const unreadCount = computed(
  () => incidents.value.filter((i) => i.status === "open" || i.status === "investigating").length,
);

const filteredIncidents = computed(() => {
  let list = incidents.value.filter((i) => tabMatches(i, activeTab.value));
  list = [...list].sort((a, b) => {
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    return sortMode.value === "newest" ? tb - ta : ta - tb;
  });
  return list;
});

interface IncidentGroup {
  key: string;
  label: string;
  items: Incident[];
}

const groupedIncidents = computed((): IncidentGroup[] => {
  if (groupMode.value === "none") {
    return [{ key: "all", label: "All incidents", items: filteredIncidents.value }];
  }

  const map = new Map<string, Incident[]>();
  for (const incident of filteredIncidents.value) {
    const key = incident.stream_id || "unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(incident);
  }

  return [...map.entries()]
    .map(([key, items]) => ({
      key,
      label: `Camera ${key}`,
      items,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

const inboxTabs: { id: InboxTab; label: string }[] = [
  { id: "important", label: "Important" },
  { id: "others", label: "Others" },
  { id: "snoozed", label: "Snoozed" },
  { id: "activity", label: "Activity" },
];

function toggleGroup(key: string) {
  const next = new Set(collapsedGroups.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  collapsedGroups.value = next;
}

function isGroupCollapsed(key: string): boolean {
  return collapsedGroups.value.has(key);
}

async function patchStatus(id: number, status: IncidentStatus, successMsg: string) {
  actingId.value = id;
  try {
    await updateIncident(id, { status });
    toast.success(successMsg);
    await incidentsStore.fetchIncidents();
  } catch (e: any) {
    toast.error(e?.data?.errors?._?.[0] || "Action failed");
  } finally {
    actingId.value = null;
  }
}

function onRead(incident: Incident) {
  patchStatus(incident.id, "resolved", "Incident marked as read");
}

function onSnooze(incident: Incident) {
  patchStatus(incident.id, "investigating", "Incident snoozed for investigation");
}

function onRemove(incident: Incident) {
  patchStatus(incident.id, "false_positive", "Incident removed as false positive");
}

async function markAllRead() {
  const openItems = incidents.value.filter((i) => i.status === "open");
  if (openItems.length === 0) {
    toast.message("No open incidents to resolve");
    return;
  }
  markingAll.value = true;
  try {
    await Promise.all(openItems.map((i) => updateIncident(i.id, { status: "resolved" })));
    toast.success(`Marked ${openItems.length} incident(s) as read`);
    await incidentsStore.fetchIncidents();
  } catch {
    toast.error("Failed to mark all as read");
  } finally {
    markingAll.value = false;
  }
}
</script>

<template>
  <div class="incidents-inbox mx-auto max-w-5xl space-y-8 pb-12">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-foreground">Incidents</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ unreadCount }} unread update{{ unreadCount === 1 ? "" : "s" }} across your cameras
        </p>
      </div>
      <Button
        variant="outline"
        class="incidents-inbox__mark-all"
        :disabled="markingAll || unreadCount === 0"
        @click="markAllRead"
      >
        Mark all read
      </Button>
    </div>

    <!-- Category tabs -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="tab in inboxTabs"
        :key="tab.id"
        type="button"
        class="incidents-inbox__tab"
        :class="{ 'incidents-inbox__tab--active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span>{{ tab.label }}</span>
        <span class="incidents-inbox__tab-count">{{ String(tabCounts[tab.id]).padStart(2, "0") }}</span>
      </button>
    </div>

    <!-- Sort / group controls -->
    <div class="flex flex-wrap gap-3">
      <Select v-model="groupMode">
        <SelectTrigger class="incidents-inbox__select w-[190px]">
          <SelectValue placeholder="Grouped by camera" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="camera">Grouped by camera</SelectItem>
          <SelectItem value="none">Flat list</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="sortMode">
        <SelectTrigger class="incidents-inbox__select w-[160px]">
          <SelectValue placeholder="Newest first" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest first</SelectItem>
          <SelectItem value="oldest">Oldest first</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- States -->
    <div
      v-if="error && incidents.length === 0"
      class="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-8 text-center text-sm text-destructive"
    >
      {{ error }}
    </div>

    <div v-else-if="loading && incidents.length === 0" class="space-y-3">
      <div v-for="n in 3" :key="n" class="panel-surface incidents-inbox__card animate-pulse">
        <div class="h-10 w-10 rounded-full bg-muted" />
        <div class="flex-1 space-y-2">
          <div class="h-4 w-48 rounded bg-muted" />
          <div class="h-3 w-full max-w-md rounded bg-muted" />
        </div>
      </div>
    </div>

    <div
      v-else-if="filteredIncidents.length === 0"
      class="rounded-xl border border-border/60 bg-card/40 px-6 py-16 text-center"
    >
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <ClipboardList class="h-6 w-6 text-muted-foreground" />
      </div>
      <p class="text-sm font-medium text-foreground">No incidents in this view</p>
      <p class="mt-1 text-sm text-muted-foreground">
        Try another tab or wait for the detector to flag new events.
      </p>
    </div>

    <!-- Grouped list -->
    <div v-else class="space-y-8">
      <section v-for="group in groupedIncidents" :key="group.key" class="space-y-3">
        <button
          v-if="groupMode === 'camera'"
          type="button"
          class="flex w-full items-center gap-2 text-left"
          @click="toggleGroup(group.key)"
        >
          <span class="text-base font-semibold text-foreground">{{ group.label }}</span>
          <span class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {{ group.items.length }} item{{ group.items.length === 1 ? "" : "s" }}
          </span>
          <ChevronUp v-if="!isGroupCollapsed(group.key)" class="ml-auto h-4 w-4 text-muted-foreground" />
          <ChevronDown v-else class="ml-auto h-4 w-4 text-muted-foreground" />
        </button>

        <div v-show="!isGroupCollapsed(group.key)" class="space-y-3">
          <article
            v-for="incident in group.items"
            :key="incident.id"
            class="panel-surface incidents-inbox__card group"
          >
            <div class="relative shrink-0">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-muted/40"
              >
                <AlertTriangle
                  v-if="incident.type === 'violent'"
                  class="h-4 w-4 text-accent"
                />
                <Eye v-else class="h-4 w-4 text-muted-foreground" />
              </div>
              <span
                v-if="isUnread(incident)"
                class="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background"
              />
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="text-left text-sm font-semibold text-foreground hover:underline"
                  @click="openIncident(incident.id)"
                >
                  {{ incidentTitle(incident) }}
                </button>
                <span class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {{ incident.stream_id }}
                </span>
                <span class="text-xs text-muted-foreground">{{ formatTimeAgo(incident.timestamp) }}</span>
              </div>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ incidentDescription(incident) }}
              </p>
              <p class="mt-0.5 font-mono text-xs text-muted-foreground/80">
                {{ incident.incident_code }}
              </p>
            </div>

            <div class="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
              <Button
                size="sm"
                variant="ghost"
                class="incidents-inbox__action"
                :disabled="actingId === incident.id || incident.status === 'resolved'"
                @click="onRead(incident)"
              >
                <Check class="mr-1 h-3.5 w-3.5" />
                Read
              </Button>
              <Button
                size="sm"
                variant="ghost"
                class="incidents-inbox__action"
                :disabled="actingId === incident.id || incident.status === 'investigating'"
                @click="onSnooze(incident)"
              >
                <Clock3 class="mr-1 h-3.5 w-3.5" />
                Snooze
              </Button>
              <Button
                size="sm"
                variant="ghost"
                class="incidents-inbox__action incidents-inbox__action--danger"
                :disabled="actingId === incident.id || incident.status === 'false_positive'"
                @click="onRemove(incident)"
              >
                <Trash2 class="mr-1 h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          </article>
        </div>
      </section>
    </div>

    <p v-if="total > incidents.length" class="text-center text-xs text-muted-foreground">
      Showing {{ incidents.length }} of {{ total }} incidents. Increase limit in store to load more.
    </p>
  </div>
</template>

<style scoped>
.incidents-inbox__mark-all {
  border-color: hsl(var(--primary) / 0.45);
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.08);
}

.incidents-inbox__mark-all:hover:not(:disabled) {
  background: hsl(var(--primary) / 0.14);
}

.incidents-inbox__tab {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 9999px;
  border: 1px solid transparent;
  background: transparent;
  padding: 0.45rem 0.9rem;
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.incidents-inbox__tab:hover {
  background: hsl(var(--muted) / 0.45);
  color: hsl(var(--foreground));
}

.incidents-inbox__tab--active {
  border-color: hsl(var(--border));
  background: hsl(var(--muted) / 0.55);
  color: hsl(var(--foreground));
}

.incidents-inbox__tab-count {
  min-width: 1.5rem;
  border-radius: 9999px;
  background: hsl(var(--primary) / 0.18);
  padding: 0.1rem 0.45rem;
  text-align: center;
  font-size: 0.6875rem;
  font-weight: 600;
  color: hsl(var(--primary));
}

.incidents-inbox__select {
  border-radius: 9999px;
  background: hsl(var(--muted) / 0.35);
  border-color: hsl(var(--border) / 0.6);
}

.incidents-inbox__card {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1rem 1.1rem;
  color: hsl(var(--card-foreground));
}

.incidents-inbox__action {
  height: 2rem;
  border-radius: 9999px;
  border: 1px solid hsl(var(--border) / 0.55);
  background: hsl(var(--background) / 0.35);
  color: hsl(var(--primary));
  font-size: 0.75rem;
}

.incidents-inbox__action:hover:not(:disabled) {
  background: hsl(var(--primary) / 0.1);
}

.incidents-inbox__action--danger {
  color: hsl(var(--destructive));
}

@media (max-width: 640px) {
  .incidents-inbox__card {
    flex-direction: column;
  }
}
</style>
