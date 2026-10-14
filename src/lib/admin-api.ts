// Utilitários de administração. Rodam SOMENTE no servidor.
// A autorização NUNCA depende do front-end: o token do usuário é validado no Supabase a cada chamada
// e o e-mail confirmado precisa estar na lista de administradores.
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const URL_ = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "https://dwrvjectwjbvtukdreka.supabase.co";
const ANON = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "sb_publishable_FOionp7Urd5pni9-MFEtSQ_frpDJku-";
const SERVICE = process.env["SUPABASE_SERVICE_ROLE_KEY"];

// Lista de admins separada por vírgula. Padrão: o dono do projeto.
const ADMINS = (process.env["ADMIN_EMAILS"] || "erickduraes0724@gmail.com")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

let svc: SupabaseClient | null = null;
/** Cliente com service_role (ignora RLS). Nunca exponha ao navegador. */
export function serviceSb(): SupabaseClient | null {
  if (!SERVICE) return null;
  if (!svc) svc = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  return svc;
}

export type AdminCtx = { user: User; db: SupabaseClient };

/** Valida o Bearer token e a lista de admins. Retorna o contexto ou uma Response de erro. */
export async function requireAdmin(request: Request): Promise<AdminCtx | Response> {
  const db = serviceSb();
  if (!db) return json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada no servidor." }, 500);
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Não autenticado." }, 401);
  const { data, error } = await createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } }).auth.getUser(token);
  if (error || !data.user) return json({ error: "Sessão inválida ou expirada." }, 401);
  const email = (data.user.email || "").toLowerCase();
  if (!data.user.email_confirmed_at || !ADMINS.includes(email)) return json({ error: "Acesso restrito a administradores." }, 403);
  return { user: data.user, db };
}

export function generatePassword(len = 14) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => chars[n % chars.length]).join("");
}
