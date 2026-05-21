<script setup lang="ts">
import { ref, computed } from 'vue';
// Placeholder logo — replace src/assets/img/logo/logo.png with the real
// logo (keep the filename) and it shows up here automatically.
import logoUrl from '@/assets/img/logo/logo.png';

interface Props {
  message?: string;
  progress?: number;
  title?: string;
  subtitle?: string;
}

const props = withDefaults(defineProps<Props>(), {
  message: 'Memuatkan...',
  progress: 0,
  title: 'Violence Prevention',
  subtitle: 'Detection & Monitoring System',
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
            :style="{ strokeDasharray: circumference, strokeDashoffset }"
          />
        </svg>
        <svg class="ring-svg ring-spin-layer" viewBox="0 0 120 120" aria-hidden="true">
          <circle
            class="ring-spinner"
            cx="60"
            cy="60"
            :r="RADIUS"
            :style="{ strokeDasharray: `${spinnerDash} ${spinnerGap}` }"
          />
        </svg>
        <div class="ring-center">
          <img
            :src="logoUrl"
            :alt="title"
            class="ring-logo"
          />
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
            :style="{ animationDelay: `${(i - 1) * 0.2}s` }"
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
  background: #f8fafc;
  font-family: 'DM Sans', sans-serif;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}
.blob-1 {
  width: 500px; height: 500px;
  background: rgba(56, 189, 248, 0.12);
  top: -120px; right: -100px;
}
.blob-2 {
  width: 400px; height: 400px;
  background: rgba(99, 102, 241, 0.08);
  bottom: -100px; left: -80px;
}

.card {
  position: relative;
  background: #ffffff;
  border-radius: 24px;
  box-shadow:
    0 1px 3px rgba(15, 23, 42, 0.06),
    0 8px 32px rgba(15, 23, 42, 0.08),
    0 0 0 1px rgba(15, 23, 42, 0.04);
  padding: 2.5rem 2.25rem 2rem;
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  animation: cardIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
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
  stroke: #e2e8f0;
  stroke-width: 3;
}

.ring-fill {
  fill: none;
  stroke: #0ea5e9;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.65s cubic-bezier(0.4, 0, 0.2, 1);
}

.ring-spin-layer {
  animation: spin 1.4s linear infinite;
}

.ring-spinner {
  fill: none;
  stroke: #0ea5e9;
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
  height: 38px;
  object-fit: contain;
  animation: logoPulse 2.5s ease-in-out infinite;
}

.ring-pct {
  font-size: 10px;
  font-weight: 500;
  color: #0ea5e9;
  letter-spacing: 0.06em;
  font-feature-settings: 'tnum';
}

/* ── Title ─────────────────────────────────── */
.title-wrap { text-align: center; }

.title {
  font-size: 1.375rem;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin: 0;
  line-height: 1.2;
}

.subtitle {
  margin: 0.35rem 0 0;
  font-size: 0.6875rem;
  font-weight: 400;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #94a3b8;
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
  color: #64748b;
  margin: 0;
  animation: textIn 0.3s ease;
}

.dots { display: flex; gap: 6px; }

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #0ea5e9;
  animation: breathe 1.4s ease-in-out infinite;
}

/* ── Bar ───────────────────────────────────── */
.bar-wrap { width: 100%; }

.bar-track {
  width: 100%;
  height: 4px;
  background: #e2e8f0;
  border-radius: 99px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #38bdf8 0%, #0ea5e9 50%, #6366f1 100%);
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
.refresh-wrap p { font-size: 0.75rem; color: #94a3b8; margin: 0; }
.refresh-wrap button {
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: #0ea5e9;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.2s;
  padding: 0;
}
.refresh-wrap button:hover { color: #0284c7; }

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
