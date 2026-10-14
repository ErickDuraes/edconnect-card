import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { sb, MODES, MODE_CONFIG, MODE_FIELDS, modeLabel } from "@/lib/ed";
import { EdLogo } from "@/components/EdLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — Erick Durães Connect" }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

type CustomerCard = { id: string; uid: string; label: string | null; active_mode: string; is_active: boolean };
type Customer = { user_id: string; name: string | null; email: string | null; cards: CustomerCard[] };
type Created = { email: string; password?: string; uid: string; tap_url: string; public_url: string; warning?: string };

async function api<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const { data } = await sb().auth.getSession();
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}`, ...(init?.headers || {}) } });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

function Admin() {
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "denied" | "ready" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);

  const load = useCallback(async () => {
    const { data } = await sb().auth.getSession();
    if (!data.session) { navigate({ to: "/", replace: true }); return; }
    const r = await api<{ customers: Customer[] }>("/api/admin/customers");
    if (r.status === 401) { navigate({ to: "/", replace: true }); return; }
    if (r.status === 403) { setState("denied"); return; }
    if (!r.ok) { setErrMsg(r.data.error || "Erro ao carregar."); setState("error"); return; }
    setCustomers(r.data.customers); setState("ready");
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-background pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-20 max-w-[64rem] items-center justify-between px-6 sm:px-12">
          <EdLogo priority className="h-14 sm:h-16" />
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <Button variant="secondary" size="sm" onClick={() => navigate({ to: "/dashboard" })}>Meu painel</Button>
            <Button variant="secondary" size="sm" onClick={async () => { await sb().auth.signOut(); navigate({ to: "/", replace: true }); }}>Sair</Button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[64rem] space-y-16 px-6 pb-24 pt-12 sm:px-12" aria-busy={state === "loading"}>
        {state === "loading" && <p className="text-muted-foreground">Carregando…</p>}
        {state === "denied" && (
          <div className="max-w-xl space-y-3 rounded-3xl border border-border bg-card p-8" role="alert">
            <h1 className="text-title">Acesso restrito</h1>
            <p className="text-muted-foreground">Esta área é só para administradores.</p>
          </div>
        )}
        {state === "error" && (
          <div className="max-w-xl space-y-5 rounded-3xl border border-border bg-card p-8" role="alert">
            <h1 className="text-title">Não foi possível carregar</h1>
            <p className="text-muted-foreground">{errMsg}</p>
            <Button onClick={() => { setState("loading"); load(); }}>Tentar de novo</Button>
          </div>
        )}
        {state === "ready" && (
          <>
            <NewCustomer customers={customers} onDone={load} />
            <section className="space-y-4" aria-labelledby="list-title">
              <h2 id="list-title" className="text-title">Clientes ({customers.length})</h2>
              <ul className="divide-y divide-border rounded-3xl border border-border bg-card">
                {customers.length === 0 && <li className="p-6 text-muted-foreground">Nenhum cliente ainda.</li>}
                {customers.map((c) => (
                  <li key={c.user_id} className="space-y-1 p-5">
                    <p className="font-medium">{c.name || "Sem nome"} <span className="font-normal text-muted-foreground">· {c.email || c.user_id}</span></p>
                    {c.cards.length === 0 ? <p className="text-sm text-muted-foreground">Sem cartões</p> : (
                      <ul className="text-sm text-muted-foreground">
                        {c.cards.map((k) => <li key={k.id}><code>{k.uid}</code> · {modeLabel(k.active_mode)}{k.is_active ? "" : " · pausado"}</li>)}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-background px-4 py-3">
      <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="truncate font-mono text-sm">{value}</p></div>
      <Button type="button" variant="secondary" size="sm" aria-label={`Copiar ${label}`} onClick={() => { navigator.clipboard.writeText(value).then(() => toast.success("Copiado.")); }}><Copy aria-hidden="true" /></Button>
    </div>
  );
}

function NewCustomer({ customers, onDone }: { customers: Customer[]; onDone: () => void }) {
  const [existing, setExisting] = useState(false);
  const [ownerId, setOwnerId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [uid, setUid] = useState("");
  const [mode, setMode] = useState("perfil");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Created | null>(null);

  const fields = (MODE_FIELDS[mode] ?? []).filter((f) => f.required);
  const select = "h-12 w-full rounded-full border border-input bg-background px-5 text-base text-foreground";

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setCreated(null);
    const body = existing ? { owner_id: ownerId, label: name, uid, mode, config } : { email, name, password: password || undefined, uid, mode, config };
    const r = await api<Created>("/api/admin/customers", { method: "POST", body: JSON.stringify(body) });
    setBusy(false);
    if (!r.ok) { setError(r.data.error || "Erro ao criar."); return; }
    setCreated(r.data);
    if (r.data.warning) toast.warning(r.data.warning); else toast.success("Cliente e cartão criados.");
    setUid(""); setConfig({}); setPassword(""); if (!existing) { setEmail(""); setName(""); }
    onDone();
  }

  return (
    <section className="grid gap-10 lg:grid-cols-2" aria-labelledby="new-title">
      <form onSubmit={submit} className="space-y-5">
        <h1 id="new-title" className="text-title">Novo cliente + cartão</h1>
        <div className="flex gap-2" role="group" aria-label="Tipo de cliente">
          <Button type="button" size="sm" variant={existing ? "secondary" : "default"} onClick={() => setExisting(false)}>Cliente novo</Button>
          <Button type="button" size="sm" variant={existing ? "default" : "secondary"} onClick={() => setExisting(true)}>Cliente existente</Button>
        </div>

        {existing ? (
          <>
            <div className="space-y-2"><Label htmlFor="a-owner">Cliente</Label>
              <select id="a-owner" className={select} value={ownerId} onChange={(e) => setOwnerId(e.target.value)} required>
                <option value="">Selecione…</option>
                {customers.map((c) => <option key={c.user_id} value={c.user_id}>{c.name || c.email || c.user_id}</option>)}
              </select></div>
            <div className="space-y-2"><Label htmlFor="a-label">Nome do cartão</Label><Input id="a-label" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria Silva — Loja 2…" required /></div>
          </>
        ) : (
          <>
            <div className="space-y-2"><Label htmlFor="a-name">Nome do cliente</Label><Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" required /></div>
            <div className="space-y-2"><Label htmlFor="a-email">E-mail (login)</Label><Input id="a-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" spellCheck={false} required /></div>
            <div className="space-y-2"><Label htmlFor="a-pass">Senha (vazio = gerar automática)</Label><Input id="a-pass" type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" minLength={8} /></div>
          </>
        )}

        <div className="space-y-2"><Label htmlFor="a-uid">UID do cartão</Label><Input id="a-uid" value={uid} onChange={(e) => setUid(e.target.value)} placeholder="card_maria…" autoComplete="off" spellCheck={false} autoCapitalize="none" required /></div>
        <div className="space-y-2"><Label htmlFor="a-mode">Modo inicial</Label>
          <select id="a-mode" className={select} value={mode} onChange={(e) => { setMode(e.target.value); setConfig({}); }}>
            {MODES.map((m) => <option key={m} value={m}>{MODE_CONFIG[m]?.label}</option>)}
          </select></div>
        {fields.map((f) => (
          <div key={f.key} className="space-y-2"><Label htmlFor={`a-${f.key}`}>{f.label}</Label>
            <Input id={`a-${f.key}`} type={f.type} autoComplete="off" spellCheck={false} placeholder={f.placeholder} value={config[f.key] || ""} onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })} /></div>
        ))}
        <div aria-live="polite">{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Criando…" : existing ? "Criar cartão" : "Criar cliente e cartão"}</Button>
      </form>

      <div aria-live="polite">
        {created && (
          <div className="space-y-3 rounded-3xl border border-border bg-card p-6">
            <h2 className="text-title">Pronto</h2>
            {created.warning && <p className="text-sm text-destructive">{created.warning}</p>}
            <CopyRow label="Login (e-mail)" value={created.email} />
            {created.password && <CopyRow label="Senha (aparece só agora)" value={created.password} />}
            <CopyRow label="Link para gravar no chip NFC" value={created.tap_url} />
            <CopyRow label="Página pública" value={created.public_url} />
          </div>
        )}
      </div>
    </section>
  );
}
