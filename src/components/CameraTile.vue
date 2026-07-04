<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from "vue";
import { Badge } from "@/components/ui/badge";
import { Video, VideoOff, AlertTriangle, Eye, EyeOff } from "lucide-vue-next";

/**
 * Live-camera tile. Shows a placeholder feed area + camera metadata
 * + a recent-alert indicator. The actual MJPEG image is rendered only
 * when `feedUrl` is provided AND `online` is true — otherwise a styled
 * placeholder fills the space so the grid layout is stable.
 *
 * Each camera has its own detector worker and its own `/video_feed/<id>`
 * MJPEG endpoint; `online` should be driven by the Stream's `is_live` flag.
 */
interface Props {
  name: string;
  location?: string;
  streamId?: string;
  feedUrl?: string;
  /** Raw feed URL (no skeleton/boxes). Enables the overlay toggle button. */
  rawFeedUrl?: string;
  online?: boolean;
  /** Pulse a red border when there's a recent alert on this camera. */
  recentAlert?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  location: "",
  streamId: "",
  feedUrl: "",
  rawFeedUrl: "",
  online: false,
  recentAlert: false,
});

const showOverlay = ref(true);
const activeFeedUrl = computed(() =>
  !showOverlay.value && props.rawFeedUrl ? props.rawFeedUrl : props.feedUrl
);

// If the MJPEG <img> fails to load (BE down, detector not running,
// wrong URL) fall back to the placeholder instead of a broken-image icon.
const feedFailed = ref(false);
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRetry() {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    feedFailed.value = false; // triggers re-mount of <img>
  }, 4000);
}

watch(
  () => [props.feedUrl, props.online],
  () => {
    feedFailed.value = false;
  },
);

watch(feedFailed, (failed) => {
  if (failed && props.online && props.feedUrl) scheduleRetry();
});

onUnmounted(() => {
  if (retryTimer) clearTimeout(retryTimer);
});

const showFeed = computed(() => props.online && !!activeFeedUrl.value && !feedFailed.value);
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
        :src="activeFeedUrl"
        :alt="`Live feed from ${name}`"
        class="w-full h-full object-cover"
        @error="feedFailed = true"
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

    <!-- Top-right: live / offline indicator + overlay toggle -->
    <div class="absolute top-2 right-2 flex items-center gap-1.5">
      <button
        v-if="online && rawFeedUrl"
        :title="showOverlay ? 'Hide skeleton overlay' : 'Show skeleton overlay'"
        class="flex items-center justify-center w-6 h-6 rounded bg-black/50 text-white hover:bg-black/70 transition-colors"
        @click.stop="showOverlay = !showOverlay"
      >
        <EyeOff v-if="showOverlay" class="w-3.5 h-3.5" />
        <Eye v-else class="w-3.5 h-3.5 text-yellow-300" />
      </button>
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
