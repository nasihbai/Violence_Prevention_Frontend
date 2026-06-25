<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import { getIncident, updateIncident } from "@/services/incidents.service";
import { acknowledgeAlert, dismissAlert } from "@/services/alerts.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-vue-next";
import { severityBadgeClass, statusBadgeClass } from "@/lib/incident-styles";
import type { Alert, Incident, IncidentStatus } from "@/types/alerts";

const route = useRoute();
const router = useRouter();

const incident = ref<Incident | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const editedNotes = ref("");
const savingNotes = ref(false);
const savingStatus = ref<IncidentStatus | null>(null);
const actingAlertId = ref<number | null>(null);

const incidentId = computed(() => Number(route.params.id));

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const data = await getIncident(incidentId.value);
    incident.value = data;
    editedNotes.value = data.notes ?? "";
  } catch (e: any) {
    error.value = e?.data?.errors?._?.[0] || e?.message || "Failed to load incident";
    incident.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(incidentId, load);

// ---------- Status transitions ----------

const STATUS_FLOW: { from: IncidentStatus[]; to: IncidentStatus; label: string; variant: "default" | "outline" | "destructive" }[] = [
  { from: ["open"],                          to: "investigating",   label: "Start investigating", variant: "default" },
  { from: ["open", "investigating"],         to: "resolved",        label: "Mark resolved",       variant: "default" },
  { from: ["open", "investigating"],         to: "false_positive",  label: "False positive",      variant: "outline" },
  { from: ["resolved", "false_positive"],    to: "investigating",   label: "Reopen",              variant: "outline" },
];

const availableTransitions = computed(() => {
  if (!incident.value) return [];
  return STATUS_FLOW.filter((t) => t.from.includes(incident.value!.status));
});

async function transitionTo(newStatus: IncidentStatus) {
  if (!incident.value) return;
  savingStatus.value = newStatus;
  try {
    const updated = await updateIncident(incident.value.id, { status: newStatus });
    // Server payload doesn't include the alerts array — preserve what we have.
    incident.value = { ...updated, alerts: incident.value.alerts };
    toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
  } catch (e: any) {
    toast.error(e?.data?.errors?._?.[0] || "Failed to update status");
  } finally {
    savingStatus.value = null;
  }
}

// ---------- Notes ----------

const notesDirty = computed(
  () => editedNotes.value !== (incident.value?.notes ?? ""),
);

async function saveNotes() {
  if (!incident.value || !notesDirty.value) return;
  savingNotes.value = true;
  try {
    const updated = await updateIncident(incident.value.id, { notes: editedNotes.value });
    incident.value = { ...updated, alerts: incident.value.alerts };
    toast.success("Notes saved");
  } catch (e: any) {
    toast.error(e?.data?.errors?._?.[0] || "Failed to save notes");
  } finally {
    savingNotes.value = false;
  }
}

// ---------- Per-alert actions ----------

function replaceAlert(updated: Alert) {
  if (!incident.value?.alerts) return;
  const idx = incident.value.alerts.findIndex((a) => a.id === updated.id);
  if (idx !== -1) incident.value.alerts[idx] = updated;
}

async function onAcknowledge(id: number) {
  actingAlertId.value = id;
  try {
    replaceAlert(await acknowledgeAlert(id));
    toast.success("Alert acknowledged");
  } catch {
    toast.error("Failed to acknowledge");
  } finally {
    actingAlertId.value = null;
  }
}
async function onDismiss(id: number) {
  actingAlertId.value = id;
  try {
    replaceAlert(await dismissAlert(id));
    toast.success("Alert dismissed");
  } catch {
    toast.error("Failed to dismiss");
  } finally {
    actingAlertId.value = null;
  }
}

// ---------- UI helpers ----------

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function back() {
  router.back();
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header / back -->
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="sm" @click="back">
        <ArrowLeft class="w-4 h-4 mr-1" />
        Back
      </Button>
      <h1 class="type-page-title text-foreground">
        {{ incident?.incident_code || "Incident" }}
      </h1>
      <Badge
        v-if="incident"
        :class="statusBadgeClass(incident.status)"
      >
        {{ incident.status.replace("_", " ") }}
      </Badge>
    </div>

    <!-- Error or not found -->
    <Card v-if="error && !incident">
      <CardContent class="py-8 text-center space-y-2">
        <p class="text-sm font-medium text-destructive">{{ error }}</p>
        <Button variant="outline" size="sm" @click="load">Try again</Button>
      </CardContent>
    </Card>

    <!-- Skeleton while loading + no data -->
    <Card v-else-if="loading && !incident">
      <CardContent class="py-8">
        <div class="space-y-3 animate-pulse">
          <div class="h-4 w-1/2 rounded bg-muted" />
          <div class="h-4 w-1/3 rounded bg-muted" />
          <div class="h-24 w-full rounded bg-muted" />
        </div>
      </CardContent>
    </Card>

    <template v-else-if="incident">
      <!-- Summary card -->
      <Card>
        <CardHeader>
          <CardTitle>Incident details</CardTitle>
          <CardDescription>
            Detected by camera <span class="font-mono">{{ incident.stream_id }}</span>
            on {{ formatTime(incident.timestamp) }}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt class="text-muted-foreground">Type</dt>
              <dd class="font-medium capitalize mt-1">{{ incident.type }}</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">Severity</dt>
              <dd class="mt-1">
                <Badge :class="severityBadgeClass(incident.severity)">
                  {{ incident.severity }}
                </Badge>
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground">Confidence</dt>
              <dd class="font-medium mt-1">
                {{ (incident.confidence * 100).toFixed(1) }}%
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground">Location</dt>
              <dd class="font-medium mt-1">{{ incident.location || "—" }}</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">Detected at</dt>
              <dd class="font-medium mt-1">{{ formatTime(incident.timestamp) }}</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">Created at</dt>
              <dd class="font-medium mt-1">{{ formatTime(incident.created_at) }}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <!-- Status transitions -->
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>
            Move this incident through the response workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="availableTransitions.length === 0" class="text-sm text-muted-foreground">
            No transitions available from <span class="font-mono">{{ incident.status }}</span>.
          </div>
          <div v-else class="flex flex-wrap gap-2">
            <Button
              v-for="t in availableTransitions"
              :key="t.to"
              :variant="t.variant"
              :disabled="savingStatus !== null"
              @click="transitionTo(t.to)"
            >
              {{ savingStatus === t.to ? "Saving…" : t.label }}
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Notes -->
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>
            Investigator-visible context. Saved server-side.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <Textarea
            v-model="editedNotes"
            placeholder="Add a note about this incident…"
            rows="4"
          />
          <div class="flex items-center gap-2">
            <Button
              size="sm"
              :disabled="!notesDirty || savingNotes"
              @click="saveNotes"
            >
              {{ savingNotes ? "Saving…" : "Save notes" }}
            </Button>
            <Button
              v-if="notesDirty"
              size="sm"
              variant="ghost"
              @click="editedNotes = incident.notes ?? ''"
            >
              Discard
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Embedded alerts -->
      <Card>
        <CardHeader>
          <CardTitle>Alerts ({{ incident.alerts?.length ?? 0 }})</CardTitle>
          <CardDescription>
            Notification rows generated by this incident.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="!incident.alerts || incident.alerts.length === 0" class="text-sm text-muted-foreground py-6 text-center">
            No alerts on this incident.
          </div>
          <div v-else class="divide-y">
            <div
              v-for="alert in incident.alerts"
              :key="alert.id"
              class="py-3 flex items-center justify-between gap-4"
              :class="{ 'opacity-60': alert.dismissed }"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{{ alert.type }}</Badge>
                  <Badge v-if="alert.acknowledged" variant="secondary">acknowledged</Badge>
                  <Badge v-if="alert.dismissed" variant="secondary">dismissed</Badge>
                </div>
                <div class="mt-1 text-sm">
                  <span class="font-medium">{{ formatTime(alert.timestamp) }}</span>
                  <span class="text-muted-foreground">
                    · {{ (alert.confidence * 100).toFixed(1) }}%
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <Button
                  v-if="!alert.acknowledged"
                  size="sm"
                  variant="default"
                  :disabled="actingAlertId === alert.id"
                  @click="onAcknowledge(alert.id)"
                >
                  Acknowledge
                </Button>
                <Button
                  v-if="!alert.dismissed"
                  size="sm"
                  variant="outline"
                  :disabled="actingAlertId === alert.id"
                  @click="onDismiss(alert.id)"
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
    </template>
  </div>
</template>
