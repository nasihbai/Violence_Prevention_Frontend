<script setup lang="ts">
import { onMounted, reactive, ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { toast } from "vue-sonner";
import { useStreamsStore } from "@/stores/streams";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Video, Pencil, Trash2, Plus } from "lucide-vue-next";
import type { Stream } from "@/types/streams";

const streamsStore = useStreamsStore();
const { streams, loading, error } = storeToRefs(streamsStore);

onMounted(() => {
  streamsStore.fetchStreams();
});

// ---------- Dialog / form ----------

const dialogOpen = ref(false);
const editingId = ref<number | null>(null);
const saving = ref(false);

const form = reactive({
  stream_id: "",
  name: "",
  source_url: "",
  location: "",
  is_active: true,
});

const isEditing = computed(() => editingId.value !== null);

function resetForm() {
  form.stream_id = "";
  form.name = "";
  form.source_url = "";
  form.location = "";
  form.is_active = true;
}

function openCreate() {
  editingId.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(stream: Stream) {
  editingId.value = stream.id;
  form.stream_id = stream.stream_id;
  form.name = stream.name;
  form.source_url = stream.source_url;
  form.location = stream.location ?? "";
  form.is_active = stream.is_active;
  dialogOpen.value = true;
}

/**
 * Reka-ui controlled DialogRoot can desync its internal open-state after
 * the first open/close cycle (the second programmatic open is dropped).
 * The dialog is v-if-mounted, so this only handles user-initiated closes
 * (Esc / overlay click / X button) — translate them to dialogOpen=false,
 * which unmounts the dialog and guarantees the next open is a fresh
 * component instance.
 */
function handleDialogOpenChange(open: boolean) {
  if (!open) dialogOpen.value = false;
}

const formValid = computed(
  () =>
    form.stream_id.trim() !== "" &&
    form.name.trim() !== "" &&
    form.source_url.trim() !== "",
);

async function save() {
  if (!formValid.value) return;
  saving.value = true;
  try {
    if (isEditing.value) {
      // stream_id is immutable — send everything else
      await streamsStore.update(editingId.value!, {
        name: form.name.trim(),
        source_url: form.source_url.trim(),
        location: form.location.trim(),
        is_active: form.is_active,
      });
      toast.success("Camera updated");
    } else {
      await streamsStore.create({
        stream_id: form.stream_id.trim(),
        name: form.name.trim(),
        source_url: form.source_url.trim(),
        location: form.location.trim() || undefined,
        is_active: form.is_active,
      });
      toast.success("Camera added");
    }
    dialogOpen.value = false;
  } catch (e: any) {
    toast.error(e?.message || "Save failed");
  } finally {
    saving.value = false;
  }
}

// ---------- Row actions ----------

const togglingId = ref<number | null>(null);

async function toggleActive(stream: Stream) {
  togglingId.value = stream.id;
  try {
    await streamsStore.update(stream.id, { is_active: !stream.is_active });
    toast.success(stream.is_active ? "Camera deactivated" : "Camera activated");
  } catch (e: any) {
    toast.error(e?.message || "Toggle failed");
  } finally {
    togglingId.value = null;
  }
}

const deletingId = ref<number | null>(null);

async function onDelete(stream: Stream) {
  if (!confirm(`Deactivate camera "${stream.name}" (${stream.stream_id})?\n\nIts incident history is preserved.`)) {
    return;
  }
  deletingId.value = stream.id;
  try {
    await streamsStore.remove(stream.id);
    toast.success("Camera deactivated");
  } catch (e: any) {
    toast.error(e?.message || "Delete failed");
  } finally {
    deletingId.value = null;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="type-page-title text-foreground">Cameras</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Register and manage the camera streams the detector monitors.
        </p>
      </div>
      <Button @click="openCreate">
        <Plus class="w-4 h-4 mr-1" />
        Add camera
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Registered cameras</CardTitle>
        <CardDescription>
          Each row is one stream. Deactivating keeps incident history intact.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <!-- Error -->
        <div
          v-if="error && streams.length === 0"
          class="py-6 text-center text-sm text-destructive"
        >
          {{ error }}
        </div>

        <!-- Loading skeleton -->
        <div v-else-if="loading && streams.length === 0" class="divide-y">
          <div
            v-for="n in 3"
            :key="`sk-${n}`"
            class="py-4 flex items-center gap-4 animate-pulse"
          >
            <div class="h-9 w-9 rounded bg-muted" />
            <div class="flex-1 space-y-2">
              <div class="h-4 w-1/3 rounded bg-muted" />
              <div class="h-3 w-1/2 rounded bg-muted" />
            </div>
            <div class="h-8 w-16 rounded bg-muted" />
          </div>
        </div>

        <!-- Empty -->
        <div v-else-if="streams.length === 0" class="py-12 text-center">
          <div class="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Video class="w-6 h-6 text-muted-foreground" />
          </div>
          <p class="text-sm font-medium">No cameras registered</p>
          <p class="text-sm text-muted-foreground mt-1 mb-4">
            Add your first camera stream to start monitoring.
          </p>
          <Button size="sm" @click="openCreate">
            <Plus class="w-4 h-4 mr-1" />
            Add camera
          </Button>
        </div>

        <!-- List -->
        <div v-else class="divide-y">
          <div
            v-for="stream in streams"
            :key="stream.id"
            class="py-4 flex items-center gap-4"
            :class="{ 'opacity-55': !stream.is_active }"
          >
            <div class="h-9 w-9 rounded bg-muted flex items-center justify-center shrink-0">
              <Video class="w-4 h-4 text-muted-foreground" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-medium truncate">{{ stream.name }}</span>
                <Badge variant="outline" class="font-mono text-xs">
                  {{ stream.stream_id }}
                </Badge>
                <Badge v-if="!stream.is_active" variant="secondary">inactive</Badge>
              </div>
              <div class="mt-0.5 text-sm text-muted-foreground truncate">
                <span class="font-mono">{{ stream.source_url }}</span>
                <span v-if="stream.location"> · {{ stream.location }}</span>
              </div>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <Switch
                :model-value="stream.is_active"
                :disabled="togglingId === stream.id"
                @update:model-value="toggleActive(stream)"
              />
              <Button variant="ghost" size="icon" @click="openEdit(stream)">
                <Pencil class="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="text-destructive hover:text-destructive"
                :disabled="deletingId === stream.id"
                @click="onDelete(stream)"
              >
                <Trash2 class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Add / Edit dialog. v-if-mounted so every open is a fresh reka
         DialogRoot instance — avoids the controlled-dialog stale-state
         bug where the 2nd programmatic open is silently dropped. -->
    <Dialog v-if="dialogOpen" :open="dialogOpen" @update:open="handleDialogOpenChange">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ isEditing ? "Edit camera" : "Add camera" }}</DialogTitle>
          <DialogDescription>
            {{
              isEditing
                ? "Update this camera's details. The camera ID can't be changed."
                : "Register a new camera stream for the detector to monitor."
            }}
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-2">
          <div class="space-y-1.5">
            <Label for="stream_id">Camera ID</Label>
            <Input
              id="stream_id"
              v-model="form.stream_id"
              placeholder="CAM_01"
              :disabled="isEditing"
            />
            <p class="text-xs text-muted-foreground">
              Unique code. Immutable once created (it links incident history).
            </p>
          </div>
          <div class="space-y-1.5">
            <Label for="name">Name</Label>
            <Input id="name" v-model="form.name" placeholder="Main Entrance" />
          </div>
          <div class="space-y-1.5">
            <Label for="source_url">Source URL</Label>
            <Input
              id="source_url"
              v-model="form.source_url"
              placeholder="rtsp://… or 0 for local webcam"
            />
            <p class="text-xs text-muted-foreground">
              RTSP/HTTP stream URL, or a webcam index like <code>0</code>.
            </p>
          </div>
          <div class="space-y-1.5">
            <Label for="location">Location <span class="text-muted-foreground">(optional)</span></Label>
            <Input id="location" v-model="form.location" placeholder="Building A" />
          </div>
          <div class="flex items-center justify-between">
            <Label for="is_active">Active</Label>
            <Switch id="is_active" v-model="form.is_active" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" :disabled="saving" @click="dialogOpen = false">
            Cancel
          </Button>
          <Button :disabled="!formValid || saving" @click="save">
            {{ saving ? "Saving…" : isEditing ? "Save changes" : "Add camera" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
