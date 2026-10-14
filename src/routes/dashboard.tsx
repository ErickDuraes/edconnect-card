import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, CalendarDays, Check, ClipboardList, ExternalLink, Globe, LayoutGrid, Megaphone, MessageCircle, Plus, ShoppingBag, Star, type LucideIcon } from "lucide-react";
import {
  sb, MODES, MODE_CONFIG, MODE_FIELDS, modeLabel, canonicalMode, validateModeConfig, destinationOf,
  loadInteractions, loadInteractionTotal, formatDateTime, tapTime,
  type Card, type CardMode, type Tap, type ModeInfo,
} from "@/lib/ed";
import { computeStats } from "@/lib/stats";
import { EdLogo } from "@/components/EdLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PhysicalCard } from "@/components/PhysicalCard";
import { Tilt } from "@/components/Tilt";
import { Reveal } from "@/components/Reveal";
import { CountUp } from "@/components/CountUp";
import { SectionHead, Overview, Audience, Observability, RecentTaps } from "@/components/Analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  // O cartão selecionado vive na URL (?card=ID): dá para recarregar, voltar e compartilhar o link.
  validateSearch: (s: Record<string, unknown>): { card?: string } => (typeof s["card"] === "string" && s["card"] ? { card: s["card"] } : {}),
  head: () => ({
    meta: [
      { title: "Painel — Erick Durães Connect" },
      { name: "description", content: "Destino do cartão, modos, gráficos e saúde dos toques dos últimos 30 dias." },
      { property: "og:title", content: "Painel — Erick Durães Connect" },
      { property: "og:description", content: "Central de controle do cartão Erick Durães Connect." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const rise = (i: number) => ({ "--i": i }) as React.CSSProperties;
const FALLBACK: ModeInfo = { label: "", description: "", symbol: "•", lead: "", ideal: "", help: "" };
const modeInfo = (m: string): ModeInfo => MODE_CONFIG[m] ?? { ...FALLBACK, label: m };

function Dashboard() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const [userName, setUserName] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [modes, setModes] = useState<CardMode[]>([]);
  const [taps, setTaps] = useState<Tap[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: u } = await sb().auth.getUser();
      if (!u.user) { navigate({ to: "/", replace: true }); return; }
      setUserName(u.user.user_metadata?.["full_name"] || u.user.user_metadata?.["name"] || u.user.email || "Titular");
      const { data: c, error } = await sb().from("cards").select("*").eq("owner_id", u.user.id).order("created_at", { ascending: false });
      if (error) throw error;
      const list = (c as Card[]) || [];
      const ids = list.map((x) => x.id);
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [t, tot, m] = await Promise.all([
        ids.length ? loadInteractions(since, ids) : Promise.resolve([]),
        loadInteractionTotal(ids),
        ids.length ? sb().from("card_modes").select("*").in("card_id", ids).then((r) => { if (r.error) throw r.error; return (r.data as CardMode[]) || []; }) : Promise.resolve([]),
      ]);
      setCards(list); setTaps(t); setTotal(tot); setModes(m);
      setState("ready");
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setErrMsg(`${err.message || "Erro de conexão."}${err.code ? ` (${err.code})` : ""}`);
      setState("error");
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  async function signOut() {
    await sb().auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const selectedId = cards.some((c) => c.id === search.card) ? (search.card as string) : cards[0]?.id || "";
  const selectCard = (id: string) => navigate({ search: { card: id }, replace: true });
  const card = cards.find((c) => c.id === selectedId);
  const cardModes = modes.filter((m) => m.card_id === selectedId);
  const cardTaps = useMemo(() => taps.filter((t) => t.card_id === selectedId), [taps, selectedId]);
  const stats = useMemo(() => computeStats(cardTaps), [cardTaps]);

  async function toggleActive(next: boolean, quiet = false) {
    if (!card) return;
    const patch = { is_active: next, updated_at: new Date().toISOString() };
    const { error } = await sb().from("cards").update(patch).eq("id", card.id);
    if (error) { toast.error("Não foi possível alterar o status do cartão. Tente de novo."); return; }
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, ...patch } : c)));
    if (quiet) return;
    if (next) toast.success("Cartão ativado.");
    else toast("Cartão pausado.", { description: "Quem tocar nele não será levado a nenhum destino.", action: { label: "Desfazer", onClick: () => { void toggleActive(true, true); toast.success("Cartão ativado."); } } });
  }

  async function activateMode(mode: string) {
    if (!card) return;
    const rec = cardModes.find((m) => m.mode === mode);
    if (!rec?.is_enabled) { toast.error("Habilite e salve este modo antes de ativá-lo."); return; }
    const v = validateModeConfig(mode, rec.config || {});
    if (!v.valid) { toast.error(v.message); return; }
    const { data, error } = await sb().from("cards").update({ active_mode: mode, updated_at: new Date().toISOString() }).eq("id", card.id).select("*").single();
    if (error) { toast.error(`Não foi possível ativar o modo${error.code ? ` (${error.code})` : ""}. Tente de novo.`); return; }
    setCards((cs) => cs.map((c) => (c.id === card.id ? (data as Card) : c)));
    toast.success(`${modeLabel(mode)} ativado para este cartão.`);
  }

  async function saveMode(mode: string, enabled: boolean, config: Record<string, string>, quiet = false) {
    if (!card) return false;
    if (!enabled && canonicalMode(card.active_mode) === mode) { toast.error("Ative outro modo antes de desabilitar o modo atualmente ativo."); return false; }
    const v = validateModeConfig(mode, config);
    if (enabled && !v.valid) { toast.error(v.message); return false; }
    const persisted = v.valid ? v.config : config;
    const existing = cardModes.find((m) => m.mode === mode);
    const updated_at = new Date().toISOString();
    const res = existing
      ? await sb().from("card_modes").update({ is_enabled: enabled, config: persisted, updated_at }).eq("id", existing.id).select("*").single()
      : await sb().from("card_modes").upsert({ card_id: card.id, mode, is_enabled: enabled, config: persisted, updated_at }, { onConflict: "card_id,mode" }).select("*").single();
    if (res.error) { toast.error(`Não foi possível salvar${res.error.code ? ` (${res.error.code})` : ""}. Tente de novo.`); return false; }
    const row = res.data as CardMode;
    setModes((ms) => (ms.some((m) => m.id === row.id) ? ms.map((m) => (m.id === row.id ? row : m)) : [...ms, row]));
    if (!quiet) toast.success("Configuração salva.");
    return true;
  }

  // Um clique: salva o destino, habilita o modo e já deixa o cartão usando ele.
  async function useMode(mode: string, config: Record<string, string>) {
    if (!card) return false;
    const ok = await saveMode(mode, true, config, true);
    if (!ok) return false;
    const { data, error } = await sb().from("cards").update({ active_mode: mode, updated_at: new Date().toISOString() }).eq("id", card.id).select("*").single();
    if (error) { toast.error(`O destino foi salvo, mas não foi possível ativá-lo${error.code ? ` (${error.code})` : ""}. Tente de novo.`); return false; }
    setCards((cs) => cs.map((c) => (c.id === card.id ? (data as Card) : c)));
    toast.success(`Pronto! No próximo toque, o cartão abre ${modeLabel(mode)}.`);
    return true;
  }

  const activeKey = card ? canonicalMode(card.active_mode) : "perfil";
  const activeCfg = card ? cardModes.find((m) => m.mode === activeKey) : undefined;
  const destination = destinationOf(activeKey, activeCfg?.config);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-background/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[80rem] items-center justify-between px-6 sm:px-12">
          <EdLogo priority className="h-14 sm:h-16" />
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <span className="hidden max-w-56 truncate text-sm text-muted-foreground sm:block">{userName}</span>
            <Button variant="secondary" size="sm" onClick={signOut}>Sair</Button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[80rem] space-y-28 px-6 pb-[max(7rem,env(safe-area-inset-bottom))] pt-12 sm:px-12 sm:pt-16" aria-busy={state === "loading"}>
        {state === "loading" && <DashboardSkeleton />}

        {state === "error" && (
          <div className="max-w-xl space-y-5 rounded-3xl border border-border bg-card p-8" role="alert">
            <h1 className="text-title">Não foi possível carregar</h1>
            <p className="text-muted-foreground">{errMsg}</p>
            <Button onClick={() => { setState("loading"); load(); }}>Tentar de novo</Button>
          </div>
        )}

        {state === "ready" && !card && (
          <div className="max-w-2xl space-y-6 py-16">
            <h1 className="text-display">Nenhum cartão ainda</h1>
            <p className="max-w-md text-lg text-muted-foreground">Cadastre o UID do seu cartão físico para escolher o destino e acompanhar cada toque.</p>
            <Button size="lg" onClick={() => setCreating(true)}><Plus aria-hidden="true" /> Cadastrar cartão</Button>
          </div>
        )}

        {state === "ready" && card && (
          <>
            <section aria-labelledby="hero-title" className="flex flex-wrap items-center gap-x-[4.5rem] gap-y-12">
              <div className="rise min-w-0 flex-[1_1_30rem] space-y-5">
                <Tilt className="rounded-[1.4rem] shadow-[0_40px_90px_-45px_oklch(0_0_0/0.9)]"><PhysicalCard label={card.label || ""} uid={card.uid} mode={card.active_mode} active={card.is_active} /></Tilt>
                <p className="text-[0.8rem] tracking-wide text-muted-foreground">
                  Identificação · <span className="text-foreground/90" translate="no">{card.uid}</span>
                </p>
              </div>

              <div className="min-w-0 flex-[1_1_25rem] space-y-7">
                <div className="rise flex flex-wrap items-center gap-2" style={rise(1)}>
                  {cards.length > 1 && cards.map((c) => (
                    <Button key={c.id} size="sm" variant={c.id === selectedId ? "default" : "secondary"} aria-pressed={c.id === selectedId} onClick={() => selectCard(c.id)}>
                      {c.label || c.uid}
                    </Button>
                  ))}
                  <Button size="sm" variant="secondary" onClick={() => setCreating(true)}><Plus aria-hidden="true" /> Novo cartão</Button>
                </div>

                <div className="rise space-y-5" style={rise(2)}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Destino atual</p>
                  <h1 id="hero-title" className="sheen break-words pb-1.5 text-[clamp(3.5rem,7vw,6rem)] leading-none tracking-[-0.03em]">{modeLabel(card.active_mode)}</h1>
                  <p className="max-w-md text-lg leading-relaxed text-muted-foreground">{modeInfo(activeKey).lead}</p>
                  <p className="break-all text-sm text-muted-foreground" translate="no">{destination || "Destino não configurado"}</p>
                </div>

                <dl className="rise flex flex-wrap gap-x-10 gap-y-4" style={rise(3)}>
                  <div className="space-y-1">
                    <dt className="text-sm text-muted-foreground">Último toque</dt>
                    <dd className="font-semibold">{stats.last ? formatDateTime(tapTime(stats.last)) : "Nenhum ainda"}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-sm text-muted-foreground">Toques hoje</dt>
                    <dd className="font-semibold tabular-nums"><CountUp value={stats.today} /></dd>
                  </div>
                </dl>

                <div className="rise flex flex-wrap items-center gap-3" style={rise(4)}>
                  <Button asChild size="lg" className="btn-shine"><a href="#modos">Alterar destino</a></Button>
                  <Button type="button" size="lg" variant="secondary" aria-pressed={card.is_active} onClick={() => void toggleActive(!card.is_active)}>
                    <span className={`size-2.5 rounded-full ${card.is_active ? "bg-success" : "bg-muted-foreground"}`} aria-hidden="true" />
                    {card.is_active ? "Cartão ativo" : "Cartão pausado"}
                  </Button>
                </div>
                <p className="rise text-sm text-muted-foreground" style={rise(5)}>
                  {card.is_active ? "Cada toque leva ao destino do modo ativo." : "Os toques não levam a nenhum destino."}{" "}
                  <a href={`/c/${encodeURIComponent(card.uid)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-foreground underline underline-offset-4">
                    Ver página pública <ExternalLink className="size-3.5" aria-hidden="true" /><span className="sr-only"> (abre em nova aba)</span>
                  </a>
                </p>
              </div>
            </section>

            <Reveal>
              <ModesSection
                key={card.id}
                card={card}
                cardModes={cardModes}
                onUse={useMode}
                onActivate={activateMode}
              />
            </Reveal>

            {!taps.length && !total ? (
              <section aria-labelledby="insights-title" className="space-y-3 rounded-3xl border border-border bg-card p-10 sm:p-14">
                <h2 id="insights-title" className="text-title">Ainda sem toques</h2>
                <p className="max-w-md text-lg text-muted-foreground">Aproxime o cartão de um celular para registrar a primeira interação. Ela aparece aqui em segundos.</p>
              </section>
            ) : (
              <>
                <Reveal><Overview stats={stats} historic={total} multi={cards.length > 1} /></Reveal>
                <Reveal><Audience stats={stats} /></Reveal>
                <Reveal><Observability stats={stats} /></Reveal>
                <Reveal><RecentTaps taps={stats.recent} /></Reveal>
              </>
            )}
          </>
        )}
      </main>

      <CreateCard open={creating} onOpenChange={setCreating} onCreated={(id) => { selectCard(id); load(); }} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-wrap gap-12" role="status">
      <span className="sr-only">Carregando cartões e interações…</span>
      <Skeleton className="aspect-[1004/638] w-full max-w-[38.75rem] flex-[1_1_30rem] rounded-[1.4rem]" />
      <div className="flex-[1_1_25rem] space-y-6">
        <Skeleton className="h-10 w-48 rounded-full" />
        <Skeleton className="h-24 w-3/4" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-12 w-2/3 rounded-full" />
      </div>
    </div>
  );
}

const MODE_ICONS: Record<string, LucideIcon> = {
  perfil: LayoutGrid, site: Globe, whatsapp: MessageCircle, catalogo: ShoppingBag,
  avaliacao: Star, evento: CalendarDays, lead: ClipboardList, campanha: Megaphone,
};

/** Escolha do modo: toque em um cartão, preencha o link e use. Modos já configurados trocam com um clique. */
function ModesSection({ card, cardModes, onUse, onActivate }: {
  card: Card; cardModes: CardMode[];
  onUse: (mode: string, config: Record<string, string>) => Promise<boolean>;
  onActivate: (mode: string) => void;
}) {
  const activeMode = canonicalMode(card.active_mode);
  const [view, setView] = useState(MODES.includes(activeMode) ? activeMode : (MODES[0] ?? "perfil"));
  const editorRef = useRef<HTMLDivElement>(null);

  function choose(mode: string) {
    setView(mode);
    const calm = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => editorRef.current?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "nearest" }), 60);
  }

  return (
    <section id="modos" aria-labelledby="modes-title" className="scroll-mt-24 space-y-10">
      <SectionHead
        id="modes-title" n="01" label="Modos" title="Para onde o cartão leva?"
        text="Toque em um destino, cole o link e clique em “Usar este destino”. A troca vale no próximo toque, sem regravar o cartão."
      />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
        {MODES.map((mode) => {
          const cfg = modeInfo(mode);
          const Icon = MODE_ICONS[mode] ?? LayoutGrid;
          const rec = cardModes.find((m) => m.mode === mode);
          const isOn = activeMode === mode;
          const ready = !!rec?.is_enabled;
          const selected = view === mode;
          return (
            <div
              key={mode}
              onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`); e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`); }}
              className={`spotlight group rounded-3xl border transition-[border-color,background-color,transform] duration-300 hover:-translate-y-0.5 ${selected ? "border-foreground bg-card" : "border-border hover:border-foreground/40"}`}
            >
              <button type="button" onClick={() => choose(mode)} aria-pressed={selected} className={`flex min-h-[12.5rem] w-full flex-col justify-between gap-6 p-6 text-left ${ready && !isOn ? "pb-[4.75rem]" : ""}`}>
                <span className="flex w-full items-center justify-between gap-3">
                  <span className={`grid size-11 place-items-center rounded-2xl border transition-colors duration-300 ${isOn ? "border-transparent bg-foreground text-background" : "border-border text-foreground group-hover:border-foreground/40"}`}>
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  {isOn ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                      <span className="live-dot size-2 rounded-full bg-success" aria-hidden="true" /> Em uso
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      {ready && <Check className="size-3.5" aria-hidden="true" />}{ready ? "Configurado" : "Não configurado"}
                    </span>
                  )}
                </span>
                <span className="block space-y-1.5">
                  <span className="block font-display text-[1.65rem] leading-tight tracking-[-0.02em]">{cfg.label}</span>
                  <span className="block text-sm leading-relaxed text-muted-foreground">{cfg.lead}</span>
                </span>
              </button>
              {ready && !isOn && (
                <Button type="button" size="sm" variant="secondary" className="absolute bottom-4 right-4 z-10 bg-background/80 backdrop-blur" onClick={() => onActivate(mode)}>
                  Usar agora
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <div ref={editorRef} className="scroll-mt-28">
        <ModeEditor
          key={`${card.id}-${view}`}
          mode={view}
          record={cardModes.find((m) => m.mode === view)}
          isActive={activeMode === view}
          onUse={(c) => onUse(view, c)}
        />
      </div>
    </section>
  );
}

function ModeEditor({ mode, record, isActive, onUse }: {
  mode: string; record?: CardMode | undefined; isActive: boolean;
  onUse: (config: Record<string, string>) => Promise<boolean>;
}) {
  const initial = record?.config || {};
  const [config, setConfig] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(clean(config)) !== JSON.stringify(clean(initial));
  const cfg = modeInfo(mode);
  const Icon = MODE_ICONS[mode] ?? LayoutGrid;
  const check = validateModeConfig(mode, clean(config));
  const preview = check.valid ? destinationOf(mode, check.config) : "";
  const label = saving ? "Salvando…" : isActive ? (dirty ? "Salvar alterações" : "Em uso no cartão") : "Usar este destino";

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <div className="pop flex flex-wrap overflow-hidden rounded-[1.75rem] border border-border bg-card">
      <div className="min-w-0 flex-[1_1_27rem] space-y-5 border-border p-8 max-lg:border-b sm:p-12 lg:border-r">
        <span className="grid size-12 place-items-center rounded-2xl border border-border"><Icon className="size-6" aria-hidden="true" /></span>
        <h3 className="text-[clamp(2.25rem,4vw,2.75rem)] leading-[1.05] tracking-[-0.025em]">{cfg.label}</h3>
        <p className="font-card text-[1.4rem] leading-snug text-foreground/90">{cfg.lead}</p>
        <p className="leading-[1.75] text-muted-foreground">{cfg.description}</p>
        <div className="space-y-1.5 border-t border-border pt-4">
          <p className="text-sm font-medium text-muted-foreground">Ideal para</p>
          <p className="leading-relaxed text-foreground/90">{cfg.ideal}</p>
        </div>
      </div>

      <form
        className="min-w-0 flex-[1_1_27rem] space-y-5 p-8 sm:p-12"
        onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onUse(clean(config)); setSaving(false); }}
      >
        <p className="text-sm font-medium text-muted-foreground">Preencha e confirme</p>
        {(MODE_FIELDS[mode] ?? []).map((f) => (
          <div key={f.key} className="space-y-2">
            <Label htmlFor={`${mode}-${f.key}`}>{f.label}{f.required && " *"}</Label>
            {f.type === "textarea" ? (
              <Textarea id={`${mode}-${f.key}`} name={f.key} autoComplete="off" value={config[f.key] || ""} placeholder={f.placeholder ? `${f.placeholder}…` : undefined} onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })} />
            ) : f.type === "select" ? (
              <select id={`${mode}-${f.key}`} name={f.key} className="h-12 w-full rounded-full border border-input bg-background px-5 text-base text-foreground" value={config[f.key] || ""} onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })}>
                <option value="">Selecione…</option>
                {f.options?.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ) : (
              <Input
                id={`${mode}-${f.key}`} name={f.key} type={f.type} autoComplete="off" spellCheck={false}
                inputMode={f.type === "tel" ? "tel" : f.type === "url" ? "url" : undefined}
                value={config[f.key] || ""} placeholder={f.placeholder ? `${f.placeholder}…` : undefined}
                onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })}
              />
            )}
          </div>
        ))}

        <p className="text-sm leading-relaxed text-muted-foreground">{cfg.help}</p>

        <div className="space-y-1 rounded-2xl border border-dashed border-border p-4" aria-live="polite">
          <p className="text-sm font-medium text-muted-foreground">Quem tocar no cartão vai para</p>
          {preview ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="min-w-0 break-all text-sm" translate="no">{preview}</span>
              <a href={preview} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-sm underline underline-offset-4">
                Testar <ArrowUpRight className="size-3.5" aria-hidden="true" /><span className="sr-only"> (abre em nova aba)</span>
              </a>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Preencha o campo acima para ver o destino.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="submit" size="lg" className="btn-shine" disabled={saving || (isActive && !dirty)}>{label}</Button>
          {dirty && <Button type="button" variant="ghost" size="sm" onClick={() => setConfig(initial)}>Descartar</Button>}
        </div>
        {dirty && <p className="text-sm text-muted-foreground" aria-live="polite">Alterações ainda não salvas</p>}
      </form>
    </div>
  );
}

function clean(c: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(c)) { const t = String(v ?? "").trim(); if (t) out[k] = t; }
  return out;
}

function CreateCard({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const [uid, setUid] = useState("");
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState("perfil");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!uid.trim() || !label.trim()) return setError("Informe o UID e o nome do cartão.");
    const cfg = mode === "perfil" ? { ...clean(config), name: label.trim() } : clean(config);
    const v = validateModeConfig(mode, cfg);
    if (!v.valid) return setError(v.message);
    setBusy(true);
    try {
      const { data: u } = await sb().auth.getUser();
      if (!u.user) throw new Error("Sessão expirada.");
      const now = new Date().toISOString();
      const { data: card, error: e1 } = await sb().from("cards").insert({ owner_id: u.user.id, uid: uid.trim(), label: label.trim(), active_mode: mode, is_active: true, created_at: now, updated_at: now }).select("*").single();
      if (e1) throw e1;
      const records = [];
      if (mode !== "perfil") records.push({ card_id: card.id, mode: "perfil", is_enabled: false, config: { name: label.trim() }, created_at: now, updated_at: now });
      records.push({ card_id: card.id, mode, is_enabled: true, config: v.config, created_at: now, updated_at: now });
      const { error: e2 } = await sb().from("card_modes").insert(records);
      if (e2) toast.error("Cartão criado, mas a configuração do modo não foi salva. Configure-a em “O que acontece no toque”.");
      else toast.success("Cartão criado.");
      setUid(""); setLabel(""); setConfig({});
      onOpenChange(false); onCreated(card.id);
    } catch (err) {
      const x = err as { code?: string };
      setError(`Não foi possível criar o cartão${x.code ? ` (${x.code})` : ""}. Confira se o UID já não está em uso e tente de novo.`);
    } finally { setBusy(false); }
  }

  const required = (MODE_FIELDS[mode] ?? []).filter((f) => f.required);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-normal tracking-[-0.02em]">Novo cartão</DialogTitle>
          <DialogDescription className="text-muted-foreground">O UID é o código usado no link do cartão, como card_maria.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2"><Label htmlFor="nuid">UID do cartão</Label><Input id="nuid" name="uid" autoComplete="off" spellCheck={false} autoCapitalize="none" placeholder="card_maria…" value={uid} onChange={(e) => setUid(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="nlabel">Nome</Label><Input id="nlabel" name="label" autoComplete="off" placeholder="Maria Silva…" value={label} onChange={(e) => setLabel(e.target.value)} /></div>
          <div className="space-y-2">
            <Label htmlFor="nmode">Modo inicial</Label>
            <select id="nmode" name="mode" className="h-12 w-full rounded-full border border-input bg-background px-5 text-base text-foreground" value={mode} onChange={(e) => { setMode(e.target.value); setConfig({}); }}>
              {MODES.map((m) => <option key={m} value={m}>{MODE_CONFIG[m]?.label}</option>)}
            </select>
          </div>
          {required.map((f) => (
            <div key={f.key} className="space-y-2">
              <Label htmlFor={`n-${f.key}`}>{f.label}</Label>
              <Input id={`n-${f.key}`} name={f.key} type={f.type} autoComplete="off" spellCheck={false} inputMode={f.type === "tel" ? "tel" : f.type === "url" ? "url" : undefined} placeholder={f.placeholder ? `${f.placeholder}…` : undefined} value={config[f.key] || ""} onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })} />
            </div>
          ))}
          <div aria-live="polite">{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Criando…" : "Criar cartão"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
