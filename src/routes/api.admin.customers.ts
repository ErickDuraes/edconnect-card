import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin, json, generatePassword } from "@/lib/admin-api";
import { MODES, canonicalMode, validateModeConfig } from "@/lib/ed";

// GET  /api/admin/customers  -> lista clientes (profiles) com seus cartões.
// POST /api/admin/customers  -> cria login (auth) + profile + cartão + modos, de uma vez.
//   Body: { email, name, password?, uid, label?, mode?, config? }            (cliente novo)
//     ou: { owner_id, uid, label?, mode?, config? }                            (novo cartão para cliente existente)
export const Route = createFileRoute("/api/admin/customers")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;
        const [p, c] = await Promise.all([
          ctx.db.from("profiles").select("user_id, name, email, created_at").order("created_at", { ascending: false }),
          ctx.db.from("cards").select("id, uid, label, owner_id, active_mode, is_active, created_at").order("created_at", { ascending: false }),
        ]);
        if (p.error || c.error) return json({ error: (p.error || c.error)!.message }, 500);
        const customers = (p.data || []).map((x) => ({ ...x, cards: (c.data || []).filter((k) => k.owner_id === x.user_id) }));
        // Donos de cartão sem linha em profiles também aparecem.
        const known = new Set((p.data || []).map((x) => x.user_id));
        for (const owner of new Set((c.data || []).map((k) => k.owner_id))) {
          if (!known.has(owner)) customers.push({ user_id: owner, name: null, email: null, created_at: "", cards: (c.data || []).filter((k) => k.owner_id === owner) });
        }
        return json({ customers });
      },

      POST: async ({ request }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;
        const { db } = ctx;

        let b: Record<string, unknown>;
        try { b = await request.json(); } catch { return json({ error: "JSON inválido." }, 400); }
        const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

        const uid = str(b["uid"]);
        const mode = canonicalMode(str(b["mode"]) || "perfil");
        const name = str(b["name"]);
        const label = str(b["label"]) || name;
        if (!/^[A-Za-z0-9_-]{3,80}$/.test(uid)) return json({ error: "UID inválido: use 3 a 80 letras, números, _ ou -." }, 400);
        if (!MODES.includes(mode)) return json({ error: "Modo inválido." }, 400);
        if (!label) return json({ error: "Informe o nome do cliente ou do cartão." }, 400);

        const rawCfg = (b["config"] && typeof b["config"] === "object" ? b["config"] : {}) as Record<string, string>;
        const cleaned: Record<string, string> = {};
        for (const [k, v] of Object.entries(rawCfg)) { const t = String(v ?? "").trim(); if (t) cleaned[k] = t; }
        const v = validateModeConfig(mode, mode === "perfil" ? { ...cleaned, name: label } : cleaned);
        if (!v.valid) return json({ error: v.message }, 400);

        const { data: dup } = await db.from("cards").select("id").eq("uid", uid).maybeSingle();
        if (dup) return json({ error: `O UID “${uid}” já está em uso.` }, 409);

        // 1) Dono do cartão: existente ou novo.
        let ownerId = str(b["owner_id"]);
        let createdUser = false;
        let password: string | undefined;
        let email = "";
        if (ownerId) {
          const { data, error } = await db.auth.admin.getUserById(ownerId);
          if (error || !data.user) return json({ error: "Cliente não encontrado." }, 404);
          email = data.user.email || "";
        } else {
          email = str(b["email"]).toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Informe um e-mail válido." }, 400);
          if (!name) return json({ error: "Informe o nome do cliente." }, 400);
          password = str(b["password"]);
          if (password && password.length < 8) return json({ error: "A senha precisa ter ao menos 8 caracteres." }, 400);
          const generated = !password;
          if (!password) password = generatePassword();
          const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
          if (error || !data.user) {
            const exists = /already|registered|exists/i.test(error?.message || "");
            return json({ error: exists ? "Já existe um login com esse e-mail. Use “cliente existente”." : `Falha ao criar login: ${error?.message}` }, exists ? 409 : 500);
          }
          ownerId = data.user.id; createdUser = true;
          if (!generated) password = undefined; // só devolve a senha quando fomos nós que geramos
        }

        const rollback = async () => { if (createdUser) await db.auth.admin.deleteUser(ownerId); };
        const now = new Date().toISOString();

        // 2) Profile (upsert: um trigger no banco pode já ter criado a linha).
        let warning: string | undefined;
        if (createdUser) {
          const { error } = await db.from("profiles").upsert(
            { user_id: ownerId, name, email, social_links: {}, created_at: now, updated_at: now },
            { onConflict: "user_id" },
          );
          if (error) warning = `Login criado, mas o profile não foi salvo (${error.code || error.message}).`;
        }

        // 3) Cartão.
        const { data: card, error: e1 } = await db.from("cards").insert({ owner_id: ownerId, uid, label, active_mode: mode, is_active: true, created_at: now, updated_at: now }).select("id, uid").single();
        if (e1 || !card) {
          await rollback();
          return json({ error: `Falha ao criar o cartão (${e1?.code || e1?.message}). Nada foi salvo.` }, 500);
        }

        // 4) Modos (mesma regra do painel: sempre existe a linha "perfil").
        const records: Record<string, unknown>[] = [];
        if (mode !== "perfil") records.push({ card_id: card.id, mode: "perfil", is_enabled: false, config: { name: label }, created_at: now, updated_at: now });
        records.push({ card_id: card.id, mode, is_enabled: true, config: v.config, created_at: now, updated_at: now });
        const { error: e2 } = await db.from("card_modes").insert(records);
        if (e2) {
          await db.from("cards").delete().eq("id", card.id);
          await rollback();
          return json({ error: `Falha ao salvar o modo do cartão (${e2.code || e2.message}). Nada foi salvo.` }, 500);
        }

        const origin = new URL(request.url).origin;
        return json({ ok: true, owner_id: ownerId, email, password, card_id: card.id, uid, tap_url: `${origin}/t/${encodeURIComponent(uid)}`, public_url: `${origin}/c/${encodeURIComponent(uid)}`, warning }, 201);
      },
    },
  },
});
