/**
 * Users API client — wraps the BE's /api/users/* endpoints (superadmin only).
 *
 * The BE User shape and the superadmin/users page's User shape differ:
 *   BE:   { id, username, email, role, is_active, created_at, last_login }
 *   page: { id, name,     email, role, status,    created,    last_login, avatar }
 * This module maps between them so the existing page barely changes —
 * every function takes / returns the page shape.
 *
 * Every call goes through unwrap() so a failed request throws.
 */
import { apiGet, apiPost, apiPatch, apiDelete, unwrap } from "@/services/api";

/** The user shape the superadmin/users page works with. */
export interface PageUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string; // 'active' | 'inactive'
  avatar: string;
  created: string;
  last_login: string | null;
}

/** The raw BE shape (database/models.py → User.to_dict()). */
interface BeUser {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
  last_login: string | null;
}

interface BeUserList {
  items: BeUser[];
  total: number;
  limit: number;
  offset: number;
}

const NO_CACHE = { cache: false } as const;

function toPageUser(u: BeUser): PageUser {
  return {
    id: u.id,
    name: u.username,
    email: u.email,
    role: u.role,
    status: u.is_active ? "active" : "inactive",
    avatar: "",
    created: u.created_at ?? "",
    last_login: u.last_login,
  };
}

/** GET /api/users — full list, mapped to the page shape. */
export async function listUsers(): Promise<PageUser[]> {
  const res = unwrap(await apiGet<BeUserList>("/api/users", undefined, NO_CACHE));
  return (res.items ?? []).map(toPageUser);
}

/** POST /api/users — create. `status` maps to is_active. */
export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: string;
  status: string;
}): Promise<PageUser> {
  const be = unwrap(
    await apiPost<BeUser>("/api/users", {
      username: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
      is_active: input.status !== "inactive",
    }),
  );
  return toPageUser(be);
}

/** PATCH /api/users/<id> — only the provided fields are sent. */
export async function updateUser(
  id: number,
  patch: Partial<{ name: string; email: string; role: string; status: string; password: string }>,
): Promise<PageUser> {
  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body.username = patch.name;
  if (patch.email !== undefined) body.email = patch.email;
  if (patch.role !== undefined) body.role = patch.role;
  if (patch.status !== undefined) body.is_active = patch.status !== "inactive";
  if (patch.password) body.password = patch.password;
  const be = unwrap(await apiPatch<BeUser>(`/api/users/${id}`, body));
  return toPageUser(be);
}

/** DELETE /api/users/<id> — soft delete; returns the now-inactive user. */
export async function deactivateUser(id: number): Promise<PageUser> {
  const be = unwrap(await apiDelete<BeUser>(`/api/users/${id}`));
  return toPageUser(be);
}
