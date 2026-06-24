import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import i18n from "./plugins/i18n";
import analyticsPlugin from "./plugins/analytics";
import configPlugin from "./plugins/config";
import { runBoot } from "./boot";
import App from "./App.vue";
import "./assets/index.css";
import "./assets/planix-theme.css";
import "./assets/transitions.css";
import "./assets/theme-customizer.css";

// Set API URL globally
window.API_URL = import.meta.env.VITE_API_URL;

// Initialize theme based on user preference.
// The app is Planix dark-first: new users (no saved preference) default to
// the dark + Planix color scheme. The light/dark infra stays intact so a
// saved preference is still honored.
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    // No saved preference → default to dark + Planix.
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }

  // Apply the color scheme at boot so auth pages (which render before
  // dashboard.vue runs) also pick up the Planix palette. The canonical key
  // is 'theme-color' (shared with ThemeCustomizer.vue / dashboard.vue).
  const savedColorScheme = localStorage.getItem('theme-color') || 'planix';
  if (!localStorage.getItem('theme-color')) {
    localStorage.setItem('theme-color', 'planix');
  }
  document.documentElement.setAttribute('data-color-scheme', savedColorScheme);
};

// Initialize theme
initializeTheme();

// Create the app with Vue
console.log("Initializing application...");

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router); // Register router before auth initialization
app.use(i18n);
app.use(configPlugin);
app.use(analyticsPlugin, { router });

// Set initial locale from localStorage if available
const savedLocale = localStorage.getItem('locale');
if (savedLocale && ['en', 'es'].includes(savedLocale)) {
  i18n.global.locale.value = savedLocale as 'en' | 'es';
}

// Kick off boot (auth session restore). Calling it here, before mount,
// means the synchronous part — restoring token + user from localStorage —
// runs before the router resolves its first route, so guards see the
// correct auth state (no login-page flash for a logged-in user). The
// async token validation continues in the background; App.vue awaits the
// same promise to drive the loading screen.
runBoot();

// Mount immediately. App.vue renders the LoadingScreen until boot resolves.
app.mount("#app");
console.log("Application mounted.");
