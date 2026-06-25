<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { toast } from "vue-sonner";
import { apiGet, apiPost, unwrap, getApiUrl } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ImageOff,
} from "lucide-vue-next";

interface QueueItem {
  id: number;
  incident_code: string;
  stream_id: string;
  type: string;
  confidence: number;
  timestamp: string;
  severity: string;
  status: string;
  screenshot_path: string | null;
  notes: string | null;
}

const PAGE_SIZE = 12;

const items = ref<QueueItem[]>([]);
const total = ref(0);
const offset = ref(0);
const loading = ref(false);

const selected = ref<QueueItem | null>(null);
const dialogOpen = ref(false);
const verdictNotes = ref("");
const submitting = ref(false);
const screenshotError = ref(false);
const reviewed = ref(0);

const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE));
const currentPage = computed(() => Math.floor(offset.value / PAGE_SIZE) + 1);

function screenshotUrl(id: number): string {
  const token = localStorage.getItem("access_token") ?? "";
  return `${getApiUrl()}/api/review/${id}/screenshot?jwt=${encodeURIComponent(token)}`;
}

async function fetchQueue() {
  loading.value = true;
  try {
    const data = unwrap(
      await apiGet<{ items: QueueItem[]; total: number }>(
        "/api/review/queue",
        { limit: PAGE_SIZE, offset: offset.value },
        { cache: false }
      )
    );
    items.value = data.items;
    total.value = data.total;
  } catch {
    toast.error("Failed to load review queue");
  } finally {
    loading.value = false;
  }
}

function openDetail(item: QueueItem) {
  selected.value = item;
  verdictNotes.value = item.notes ?? "";
  screenshotError.value = false;
  dialogOpen.value = true;
}

function closeDialog() {
  dialogOpen.value = false;
  selected.value = null;
}

async function submitVerdict(verdict: "confirmed" | "false_positive") {
  if (!selected.value) return;
  submitting.value = true;
  try {
    await unwrap(
      await apiPost(`/api/review/${selected.value.id}/verdict`, {
        verdict,
        notes: verdictNotes.value || undefined,
      })
    );
    reviewed.value += 1;
    toast.success(
      verdict === "confirmed" ? "Marked as confirmed violence" : "Marked as false positive"
    );
    closeDialog();
    fetchQueue();
  } catch {
    toast.error("Failed to submit verdict");
  } finally {
    submitting.value = false;
  }
}

async function exportLabels() {
  try {
    const data = unwrap(
      await apiGet("/api/review/export-training", undefined, { cache: false })
    );
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `training-labels-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Labels exported");
  } catch {
    toast.error("Export failed");
  }
}

function prevPage() {
  if (offset.value >= PAGE_SIZE) {
    offset.value -= PAGE_SIZE;
    fetchQueue();
  }
}

function nextPage() {
  if (offset.value + PAGE_SIZE < total.value) {
    offset.value += PAGE_SIZE;
    fetchQueue();
  }
}

function severityVariant(s: string): "destructive" | "secondary" | "outline" {
  if (s === "high" || s === "critical") return "destructive";
  if (s === "medium") return "secondary";
  return "outline";
}

function formatTs(ts: string) {
  return new Date(ts).toLocaleString();
}

function onThumbnailError(e: Event) {
  const img = e.target as HTMLImageElement;
  img.style.display = "none";
}

onMounted(fetchQueue);
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="type-page-title text-foreground">Review Queue</h1>
        <p class="text-muted-foreground text-sm mt-1">
          Classify each detected incident as confirmed violence or a false positive
          to build a labelled dataset for future retraining.
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-sm text-muted-foreground whitespace-nowrap">
          {{ total }} pending · {{ reviewed }} reviewed
        </span>
        <Button variant="outline" size="sm" @click="fetchQueue" :disabled="loading">
          <RefreshCw class="h-4 w-4 mr-1" :class="{ 'animate-spin': loading }" />
          Refresh
        </Button>
        <Button variant="outline" size="sm" @click="exportLabels">
          <Download class="h-4 w-4 mr-1" />
          Export
        </Button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="items.length === 0"
      class="flex flex-col items-center justify-center py-24 text-center"
    >
      <CheckCircle class="h-12 w-12 text-green-500 mb-4" />
      <p class="text-lg font-medium">All caught up!</p>
      <p class="text-sm text-muted-foreground mt-1">No incidents are waiting for review.</p>
    </div>

    <!-- Card grid -->
    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      <Card
        v-for="item in items"
        :key="item.id"
        class="cursor-pointer hover:border-primary/60 transition-colors overflow-hidden"
        @click="openDetail(item)"
      >
        <!-- Screenshot thumbnail -->
        <div class="relative bg-muted h-40 flex items-center justify-center overflow-hidden">
          <img
            :src="screenshotUrl(item.id)"
            class="object-cover w-full h-full"
            loading="lazy"
            @error="onThumbnailError"
          />
          <ImageOff class="absolute h-8 w-8 text-muted-foreground opacity-30 pointer-events-none" />
        </div>

        <CardContent class="p-3 space-y-1">
          <div class="flex items-center justify-between gap-1">
            <span class="text-xs font-mono text-muted-foreground truncate">
              {{ item.incident_code }}
            </span>
            <Badge :variant="severityVariant(item.severity)">
              {{ item.severity }}
            </Badge>
          </div>
          <p class="text-xs text-muted-foreground truncate">
            {{ item.stream_id }} · {{ formatTs(item.timestamp) }}
          </p>
          <p class="text-xs">
            Confidence:
            <span class="font-semibold">{{ (item.confidence * 100).toFixed(0) }}%</span>
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Pagination -->
    <div
      v-if="totalPages > 1"
      class="flex items-center justify-center gap-3 pt-2"
    >
      <Button variant="outline" size="icon" :disabled="currentPage === 1" @click="prevPage">
        <ChevronLeft class="h-4 w-4" />
      </Button>
      <span class="text-sm text-muted-foreground">Page {{ currentPage }} / {{ totalPages }}</span>
      <Button variant="outline" size="icon" :disabled="currentPage === totalPages" @click="nextPage">
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>
  </div>

  <!-- Detail dialog -->
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="max-w-3xl">
      <DialogHeader>
        <DialogTitle>{{ selected?.incident_code }}</DialogTitle>
        <DialogDescription>
          {{ selected?.stream_id }} ·
          {{ selected ? formatTs(selected.timestamp) : "" }} ·
          Confidence {{ selected ? (selected.confidence * 100).toFixed(0) : 0 }}%
        </DialogDescription>
      </DialogHeader>

      <!-- Screenshot with YOLO person boxes -->
      <div class="bg-muted rounded-md overflow-hidden flex items-center justify-center min-h-60">
        <img
          v-if="selected && !screenshotError"
          :src="screenshotUrl(selected.id)"
          class="max-h-96 w-full object-contain"
          @error="screenshotError = true"
        />
        <div
          v-else
          class="flex flex-col items-center gap-2 py-12 text-muted-foreground"
        >
          <ImageOff class="h-10 w-10" />
          <span class="text-sm">Screenshot unavailable</span>
        </div>
      </div>

      <!-- Notes -->
      <div class="space-y-1">
        <label class="text-sm font-medium">Notes (optional)</label>
        <Textarea
          v-model="verdictNotes"
          placeholder="Add context for this classification…"
          :rows="2"
        />
      </div>

      <DialogFooter class="gap-2 sm:gap-0">
        <Button variant="outline" :disabled="submitting" @click="closeDialog">
          Cancel
        </Button>
        <Button
          variant="destructive"
          :disabled="submitting"
          class="gap-1"
          @click="submitVerdict('false_positive')"
        >
          <XCircle class="h-4 w-4" />
          False Positive
        </Button>
        <Button
          :disabled="submitting"
          class="gap-1 bg-green-600 hover:bg-green-700 text-white"
          @click="submitVerdict('confirmed')"
        >
          <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
          <CheckCircle v-else class="h-4 w-4" />
          Confirm Violence
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
