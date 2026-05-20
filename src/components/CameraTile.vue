<script setup lang="ts">
import { computed } from "vue";
import { Badge } from "@/components/ui/badge";
import { Video, VideoOff, AlertTriangle } from "lucide-vue-next";

/**
 * Live-camera tile. Shows a placeholder feed area + camera metadata
 * + a recent-alert indicator. The actual MJPEG image is rendered only
 * when `feedUrl` is provided AND `online` is true — otherwise a styled
 * placeholder fills the space so the grid layout is stable.
 *
 * This component is the visual scaffold for Phase 4.5 (Multi-Camera Grid).
 * The backend half (per-stream /video_feed/<id> + parallel detectors)
 * comes later; for now you can pass `online: false` and just get the
 * "camera registered but no feed" look.
 */
interface Props {
  name: string;
  location?: string;
  streamId?: string;
  feedUrl?: string;
  online?: boolean;
  /** Pulse a red border when there's a recent alert on this camera. */
  recentAlert?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  location: "",
  streamId: "",
  feedUrl: "",
  online: false,
  recentAlert: false,
});

const showFeed = computed(() => props.online && !!props.feedUrl);
</script>

<template>
  <div
    class="relative rounded-lg overflow-hidden bg-zinc-900 border transition-all aspect-video"
    :class="recentAlert ? 'border-red-500 ring-2 ring-red-500/50 animate-pulse' : 'border-zinc-800'"
  >
    <!-- Feed area -->
    <div class="absolute inset-0">
      <img
        v-if="showFeed"
        :src="feedUrl"
        :alt="`Live feed from ${name}`"
        class="w-full h-full object-cover"
      />
      <!-- Placeholder when offline / no feed yet -->
      <div
        v-else
        class="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-500"
        :style="{
          background:
            'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.04) 0%, transparent 50%), linear-gradient(135deg, #18181b 0%, #27272a 100%)',
        }"
      >
        <VideoOff v-if="!online" class="w-10 h-10" />
        <Video v-else class="w-10 h-10" />
        <span class="text-xs font-medium">
          {{ online ? "No live feed" : "Camera offline" }}
        </span>
      </div>
    </div>

    <!-- Top-left: camera name + location -->
    <div class="absolute top-2 left-2 right-12 flex flex-col gap-0.5">
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-white drop-shadow-md truncate">
          {{ name }}
        </span>
        <Badge
          v-if="streamId"
          variant="outline"
          class="text-[10px] py-0 px-1.5 h-4 bg-black/40 text-white border-white/30 font-mono"
        >
          {{ streamId }}
        </Badge>
      </div>
      <span
        v-if="location"
        class="text-[10px] text-white/70 drop-shadow-md truncate"
      >
        {{ location }}
      </span>
    </div>

    <!-- Top-right: live / offline indicator -->
    <div class="absolute top-2 right-2">
      <Badge
        v-if="online"
        class="gap-1 bg-red-600/90 text-white border-0 hover:bg-red-600/90"
      >
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        LIVE
      </Badge>
      <Badge
        v-else
        class="bg-zinc-700/90 text-white border-0 hover:bg-zinc-700/90"
      >
        OFFLINE
      </Badge>
    </div>

    <!-- Bottom: recent-alert flash overlay -->
    <div
      v-if="recentAlert"
      class="absolute bottom-2 left-2 right-2 flex items-center gap-2 px-2 py-1.5 rounded bg-red-600/90 text-white text-xs font-medium"
    >
      <AlertTriangle class="w-3.5 h-3.5 shrink-0" />
      <span class="truncate">Violence detected</span>
    </div>
  </div>
</template>
