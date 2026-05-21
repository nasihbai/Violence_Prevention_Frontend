/**
 * Settings API client — wraps the BE's /api/settings/* endpoints.
 *
 * Settings are a flat key/value map per namespace ('app' | 'email' | 'seo').
 * Backs the three superadmin settings pages so their values persist in the
 * DB instead of browser localStorage.
 *
 * Every call goes through unwrap() so a failed request throws.
 */
import { apiGet, apiPut, apiDelete, unwrap } from "@/services/api";

export type SettingsNamespace = "app" | "email" | "seo";

/** A namespace's settings as a flat key/value map. Values are any JSON type. */
export type SettingsMap = Record<string, unknown>;

const NO_CACHE = { cache: false } as const;

/** GET /api/settings/<namespace> — the full key/value map for that namespace. */
export async function getSettings(namespace: SettingsNamespace): Promise<SettingsMap> {
  return unwrap(await apiGet<SettingsMap>(`/api/settings/${namespace}`, undefined, NO_CACHE));
}

/**
 * PUT /api/settings/<namespace> — upsert a key/value map. Keys not in the
 * payload are left untouched. Returns the namespace's full map afterwards.
 */
export async function saveSettings(
  namespace: SettingsNamespace,
  values: SettingsMap,
): Promise<SettingsMap> {
  return unwrap(await apiPut<SettingsMap>(`/api/settings/${namespace}`, values));
}

/** DELETE /api/settings/<namespace>/<key> — remove a single key. */
export async function deleteSetting(
  namespace: SettingsNamespace,
  key: string,
): Promise<void> {
  await unwrap(await apiDelete<{ ok: boolean }>(`/api/settings/${namespace}/${key}`));
}
