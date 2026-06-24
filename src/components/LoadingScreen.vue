<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDark } from '@vueuse/core';
import { useConfigStore } from '@/stores/config';
import logoUrl from '@/assets/logo.png';

interface Props {
  message?: string;
  progress?: number;
  title?: string;
  subtitle?: string;
}

const props = withDefaults(defineProps<Props>(), {
  message: 'Memuatkan...',
  progress: 0,
  title: 'SOTERIA',
  subtitle: 'Violence Detection & Monitoring',
});

const showMessage = ref(false);
setTimeout(() => {
  showMessage.value = true;
}, 8000);

const refreshPage = () => {
  window.location.reload();
};

const RADIUS = 52;
const circumference = 2 * Math.PI * RADIUS;
const strokeDashoffset = computed(
  () => circumference - (props.progress / 100) * circumference,
);

const spinnerDash = circumference * 0.25;
const spinnerGap = circumference * 0.75;

// Theme
const isDark = useDark();
const configStore = useConfigStore();
const primaryColor   = computed(() => configStore.getTheme.primaryColor   || '#0ea5e9');
const accentColor    = computed(() => configStore.getTheme.accentColor     || '#6366f1');
const fontFamily     = computed(() => configStore.getTheme.fontFamily      || 'DM Sans, sans-serif');

// CSS var bindings
const bgColor      = computed(() => isDark.value ? '#0f172a' : '#f8fafc');
const cardBg       = computed(() => isDark.value ? '#1e293b' : '#ffffff');
const cardShadow   = computed(() =>
  isDark.value
    ? '0 1px 3px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'
    : '0 1px 3px rgba(15,23,42,0.06), 0 8px 32px rgba(15,23,42,0.08), 0 0 0 1px rgba(15,23,42,0.04)',
);
const blobColor1   = computed(() => isDark.value ? `${primaryColor.value}12` : `${primaryColor.value}20`);
const blobColor2   = computed(() => isDark.value ? `${accentColor.value}0d`  : `${accentColor.value}14`);
const titleColor   = computed(() => isDark.value ? '#f1f5f9' : '#0f172a');
const subtitleColor= computed(() => isDark.value ? '#64748b' : '#94a3b8');
const statusColor  = computed(() => isDark.value ? '#94a3b8' : '#64748b');
const trackColor   = computed(() => isDark.value ? '#334155' : '#e2e8f0');
const pctColor     = computed(() => primaryColor.value);
const barGradient  = computed(() =>
  `linear-gradient(90deg, ${primaryColor.value}aa 0%, ${primaryColor.value} 50%, ${accentColor.value} 100%)`
);
const refreshBtnColor = computed(() => primaryColor.value);
</script>

<template>
  <div class="rs-loading">
    <div class="blob blob-1" aria-hidden="true"></div>
    <div class="blob blob-2" aria-hidden="true"></div>

    <div class="card">
      <!-- Ring -->
      <div class="ring-wrap">
        <svg class="ring-svg" viewBox="0 0 120 120" aria-hidden="true">
          <circle class="ring-track" cx="60" cy="60" :r="RADIUS" />
          <circle
            class="ring-fill"
            cx="60"
            cy="60"
            :r="RADIUS"
            :style="{ strokeDasharray: circumference, strokeDashoffset, stroke: primaryColor }"
          />
        </svg>
        <svg class="ring-svg ring-spin-layer" viewBox="0 0 120 120" aria-hidden="true">
          <circle
            class="ring-spinner"
            cx="60"
            cy="60"
            :r="RADIUS"
            :style="{ strokeDasharray: `${spinnerDash} ${spinnerGap}`, stroke: primaryColor }"
          />
        </svg>
        <div class="ring-center">
          <img :src="logoUrl" :alt="title" class="ring-logo" />
          <span class="ring-pct">{{ progress }}%</span>
        </div>
      </div>

      <!-- Title -->
      <div class="title-wrap">
        <h1 class="title">{{ title }}</h1>
        <p class="subtitle">{{ subtitle }}</p>
      </div>

      <!-- Status -->
      <div class="status-wrap">
        <p class="status-text" :key="message">{{ message }}</p>
        <div class="dots" aria-hidden="true">
          <span
            v-for="i in 3"
            :key="i"
            class="dot"
            :style="{ animationDelay: `${(i - 1) * 0.2}s`, background: primaryColor }"
          />
        </div>
      </div>

      <!-- Thin shimmer bar -->
      <div class="bar-wrap">
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: progress + '%' }"></div>
        </div>
      </div>

      <Transition name="fade">
        <div v-if="showMessage" class="refresh-wrap">
          <p>Ambil masa lebih lama daripada biasa?</p>
          <button @click="refreshPage">Muat semula halaman</button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;400;500;600&display=swap');

.rs-loading {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: v-bind(bgColor);
  font-family: v-bind(fontFamily);
  overflow: hidden;
  transition: background 0.3s ease;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}
.blob-1 {
  width: 500px; height: 500px;
  background: v-bind(blobColor1);
  top: -120px; right: -100px;
}
.blob-2 {
  width: 400px; height: 400px;
  background: v-bind(blobColor2);
  bottom: -100px; left: -80px;
}

.card {
  position: relative;
  background: v-bind(cardBg);
  box-shadow: v-bind(cardShadow);
  border-radius: 24px;
  padding: 2.5rem 2.25rem 2rem;
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  animation: cardIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  transition: background 0.3s ease, box-shadow 0.3s ease;
}

/* ── Ring ──────────────────────────────────── */
.ring-wrap {
  position: relative;
  width: 128px;
  height: 128px;
}

.ring-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-track {
  fill: none;
  stroke: v-bind(trackColor);
  stroke-width: 3;
  transition: stroke 0.3s ease;
}

.ring-fill {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.65s cubic-bezier(0.4, 0, 0.2, 1);
}

.ring-spin-layer {
  animation: spin 1.4s linear infinite;
}

.ring-spinner {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  opacity: 0.35;
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.ring-logo {
  height: 52px;
  object-fit: contain;
  animation: logoPulse 2.5s ease-in-out infinite;
}

.ring-pct {
  font-size: 10px;
  font-weight: 500;
  color: v-bind(pctColor);
  letter-spacing: 0.06em;
  font-feature-settings: 'tnum';
}

/* ── Title ─────────────────────────────────── */
.title-wrap { text-align: center; }

.title {
  font-size: 1.375rem;
  font-weight: 600;
  color: v-bind(titleColor);
  letter-spacing: -0.02em;
  margin: 0;
  line-height: 1.2;
  transition: color 0.3s ease;
}

.subtitle {
  margin: 0.35rem 0 0;
  font-size: 0.6875rem;
  font-weight: 400;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: v-bind(subtitleColor);
  transition: color 0.3s ease;
}

/* ── Status ────────────────────────────────── */
.status-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
}

.status-text {
  font-size: 0.8125rem;
  font-weight: 400;
  color: v-bind(statusColor);
  margin: 0;
  animation: textIn 0.3s ease;
  transition: color 0.3s ease;
}

.dots { display: flex; gap: 6px; }

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  animation: breathe 1.4s ease-in-out infinite;
}

/* ── Bar ───────────────────────────────────── */
.bar-wrap { width: 100%; }

.bar-track {
  width: 100%;
  height: 4px;
  background: v-bind(trackColor);
  border-radius: 99px;
  overflow: hidden;
  transition: background 0.3s ease;
}

.bar-fill {
  height: 100%;
  border-radius: 99px;
  background: v-bind(barGradient);
  background-size: 200% 100%;
  transition: width 0.65s cubic-bezier(0.4, 0, 0.2, 1);
  animation: shimmer 1.8s linear infinite;
}

/* ── Refresh ───────────────────────────────── */
.refresh-wrap {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  align-items: center;
}
.refresh-wrap p { font-size: 0.75rem; color: v-bind(subtitleColor); margin: 0; }
.refresh-wrap button {
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: v-bind(refreshBtnColor);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: opacity 0.2s;
  padding: 0;
}
.refresh-wrap button:hover { opacity: 0.75; }

/* ── Keyframes ─────────────────────────────── */
@keyframes cardIn {
  from { opacity: 0; transform: translateY(18px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes spin {
  from { transform: rotate(-90deg); }
  to   { transform: rotate(270deg); }
}
@keyframes logoPulse {
  0%, 100% { opacity: 1;    transform: scale(1); }
  50%       { opacity: 0.75; transform: scale(0.95); }
}
@keyframes breathe {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.7); }
  40%            { opacity: 1;   transform: scale(1); }
}
@keyframes textIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.fade-enter-active { transition: opacity 0.4s ease, transform 0.4s ease; }
.fade-enter-from   { opacity: 0; transform: translateY(6px); }

@media (prefers-reduced-motion: reduce) {
  .card            { animation: none; }
  .dot             { animation: none; opacity: 0.5; }
  .ring-fill       { transition: none; }
  .ring-spin-layer { animation: none; }
  .ring-logo       { animation: none; }
  .bar-fill        { animation: none; transition: none; }
}
</style>
