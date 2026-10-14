import { useMemo, type ReactNode } from "react";
import {
  countryName, deviceLabel, formatDateTime, formatNumber, modeLabel, tapOutcome, tapSource, tapTime,
  type Tap,
} from "@/lib/ed";
import { WEEK_LABELS, type Row, type Stats } from "@/lib/stats";

const OUTCOME_LABEL: Record<string, string> = {
  redirect: "Redirecionado", no_destination: "Sem destino", paused: "Cartão pausado", not_found: "Não encontrado", error: "Erro",
};
const outcomeLabel = (k: string) => OUTCOME_LABEL[k] ?? k;
const sourceLabel = (k: string) => (k === "nfc" ? "NFC" : k === "qr" ? "QR code" : k.toUpperCase());
const dm = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

export function SectionHead({ id, n, label, title, text }: { id?: string; n: string; label: string; title: string; text?: ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{n} · {label}</span>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <h2 id={id} className="text-[clamp(2.25rem,4.4vw,3.25rem)] leading-[1.05] tracking-[-0.025em]">{title}</h2>
      {text && <p className="max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">{text}</p>}
    </div>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 rounded-3xl border border-border bg-card p-6 sm:p-8 ${className}`}>{children}</div>;
}

function Kicker({ children }: { children: ReactNode }) {
  return <h3 className="font-sans text-xs font-semibold uppercase leading-normal tracking-[0.18em] text-muted-foreground">{children}</h3>;
}

function BarRows({ rows, label }: { rows: Row[]; label: (k: string) => string }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">Sem dados no período.</p>;
  return (
    <ul className="space-y-5">
      {rows.map((r) => (
        <li key={r.key} className="space-y-2">
          <div className="flex items-baseline justify-between gap-3 text-[0.95rem]">
            <span className="min-w-0 truncate">{label(r.key)}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{formatNumber(r.count)} · {r.pct}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-foreground/10" aria-hidden="true">
            <div className="h-full rounded-full bg-foreground" style={{ width: `${r.pct}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Números do período, gráfico por dia, por hora e mapa de calor. */
export function Overview({ stats, historic, multi }: { stats: Stats; historic: number; multi: boolean }) {
  const { days, hours, heat, heatMax } = stats;
  const chart = useMemo(() => {
    const max = Math.max(1, ...days.map((d) => d.n));
    const yMax = Math.max(4, Math.ceil(max / 4) * 4);
    const pts = days.map((d, i) => [(i * 1000) / Math.max(1, days.length - 1), 230 - (d.n / yMax) * 210] as const);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const last = pts[pts.length - 1] ?? [1000, 230];
    return { yMax, line, area: `${line} L1000,230 L0,230 Z`, last };
  }, [days]);
  const hMax = Math.max(1, ...hours);

  const kpis: { label: string; value: string; note: string }[] = [
    { label: "Toques", value: formatNumber(stats.total), note: stats.delta === null ? "Sem período anterior para comparar" : `${stats.delta >= 0 ? "+" : ""}${stats.delta}% vs. 7 dias anteriores` },
    { label: "Sessões", value: formatNumber(stats.sessions), note: `${(stats.total / Math.max(stats.sessions, 1)).toFixed(1).replace(".", ",")} toques por sessão` },
    { label: "Visitantes únicos", value: formatNumber(stats.uniques), note: "Endereços de IP distintos" },
    { label: "Taxa de sucesso", value: `${String(stats.okPct).replace(".", ",")}%`, note: `${stats.ok} de ${stats.total} levaram ao destino` },
  ];

  return (
    <section aria-labelledby="overview-title" className="space-y-10">
      <SectionHead
        id="overview-title" n="02" label="Visão geral" title="Os últimos 30 dias"
        text={`Total histórico${multi ? " (todos os cartões)" : ""}: ${formatNumber(historic)} toque${historic === 1 ? "" : "s"}. Prévias de link e testes ficam de fora.`}
      />

      <dl className="flex flex-wrap gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="min-w-0 flex-[1_1_15rem] space-y-3 rounded-3xl border border-border bg-card px-8 py-7">
            <dt className="text-sm text-muted-foreground">{k.label}</dt>
            <dd className="sheen pb-1 font-display text-[clamp(2.75rem,5vw,4rem)] leading-none tracking-[-0.03em] tabular-nums">{k.value}</dd>
            <p className="text-[0.8rem] text-muted-foreground">{k.note}</p>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-4">
        <Panel className="flex-[2_1_40rem] space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-2xl">Toques por dia</h3>
            <span className="text-sm text-muted-foreground">
              {stats.peakDay.n > 0 ? `Pico: ${stats.peakDay.n} toque${stats.peakDay.n > 1 ? "s" : ""} em ${dm(stats.peakDay.d)}` : "Sem toques no período"}
            </span>
          </div>
          <div className="flex gap-3">
            <div className="flex h-60 min-w-6 flex-col justify-between text-right text-xs tabular-nums text-muted-foreground" aria-hidden="true">
              <span>{chart.yMax}</span><span>{chart.yMax / 2}</span><span>0</span>
            </div>
            <div className="relative h-60 min-w-0 flex-1 text-foreground" role="img" aria-label={`Toques por dia nos últimos 30 dias. ${stats.peakDay.n > 0 ? `Pico de ${stats.peakDay.n} em ${dm(stats.peakDay.d)}.` : "Nenhum toque."}`}>
              <svg viewBox="0 0 1000 240" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
                <line x1="0" y1="20" x2="1000" y2="20" stroke="currentColor" strokeOpacity=".08" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="125" x2="1000" y2="125" stroke="currentColor" strokeOpacity=".08" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="230" x2="1000" y2="230" stroke="currentColor" strokeOpacity=".2" vectorEffect="non-scaling-stroke" />
                <path d={chart.area} fill="currentColor" fillOpacity=".09" />
                <path d={chart.line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
              <span
                className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-[0_0_0_6px_color-mix(in_oklch,var(--color-foreground)_16%,transparent)]"
                style={{ left: `${chart.last[0] / 10}%`, top: `${(chart.last[1] / 240) * 100}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
          <div className="flex justify-between pl-9 text-xs tabular-nums text-muted-foreground" aria-hidden="true">
            <span>{dm(days[0]?.d ?? "")}</span><span>{dm(days[15]?.d ?? "")}</span><span>{dm(days[days.length - 1]?.d ?? "")}</span>
          </div>
        </Panel>

        <Panel className="flex-[1_1_22rem] space-y-6">
          <div className="space-y-1.5">
            <h3 className="text-2xl">Por hora do dia</h3>
            <p className="text-sm text-muted-foreground">{stats.peakHour === null ? "Sem toques no período" : `Pico entre ${stats.peakHour}h e ${stats.peakHour + 1}h`}</p>
          </div>
          <div className="flex h-60 items-end gap-[3px] border-b border-foreground/20" role="img" aria-label={`Toques por hora do dia. ${stats.peakHour === null ? "Nenhum toque." : `Pico entre ${stats.peakHour}h e ${stats.peakHour + 1}h.`}`}>
            {hours.map((v, h) => (
              <div
                key={h}
                className={`min-w-0 flex-1 rounded-t-sm ${v === hMax && v > 0 ? "bg-foreground" : "bg-foreground/35"}`}
                style={{ height: `${Math.max(1.5, (v / hMax) * 100)}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs tabular-nums text-muted-foreground" aria-hidden="true">
            <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
          </div>
        </Panel>
      </div>

      <Panel className="space-y-6">
        <div className="space-y-1.5">
          <h3 className="text-2xl">Quando as pessoas tocam</h3>
          <p className="text-sm text-muted-foreground">Dia da semana por hora. Quanto mais claro, mais toques. Horário de Brasília.</p>
        </div>
        <div className="overflow-x-auto">
          <div className="flex min-w-[44rem] flex-col gap-[5px]" role="img" aria-label="Mapa de calor de toques por dia da semana e hora">
            {heat.map((row, w) => (
              <div key={w} className="flex items-center gap-[5px]">
                <span className="w-10 shrink-0 text-xs text-muted-foreground">{WEEK_LABELS[w]}</span>
                {row.map((v, h) => (
                  <div
                    key={h}
                    className="h-6 min-w-0 flex-1 rounded-[5px]"
                    style={{ backgroundColor: `color-mix(in oklch, var(--color-foreground) ${v === 0 ? 5 : Math.round(18 + 82 * (v / heatMax))}%, transparent)` }}
                    title={v ? `${WEEK_LABELS[w]} ${h}h: ${v} toque${v > 1 ? "s" : ""}` : undefined}
                  />
                ))}
              </div>
            ))}
            <div className="flex items-center gap-[5px] pt-1.5" aria-hidden="true">
              <span className="w-10 shrink-0" />
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h} className="min-w-0 flex-1 text-center text-[11px] tabular-nums text-muted-foreground">{h % 3 === 0 ? h : ""}</span>
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </section>
  );
}

/** Quem toca: canal, modo, aparelho, sistema, navegador e país. */
export function Audience({ stats }: { stats: Stats }) {
  const groups: { title: string; rows: Row[]; label: (k: string) => string }[] = [
    { title: "Canal", rows: stats.source, label: sourceLabel },
    { title: "Modo", rows: stats.mode, label: (k) => modeLabel(k) },
    { title: "Aparelho", rows: stats.device, label: (k) => deviceLabel(k) },
    { title: "Sistema", rows: stats.platform, label: (k) => k },
    { title: "Navegador", rows: stats.browser, label: (k) => k },
    { title: "País", rows: stats.country, label: (k) => countryName(k) },
  ];
  return (
    <section aria-labelledby="audience-title" className="space-y-10">
      <SectionHead id="audience-title" n="03" label="Audiência" title="Quem toca no cartão" />
      <div className="flex flex-wrap gap-4">
        {groups.map((g) => (
          <Panel key={g.title} className="flex-[1_1_21rem] space-y-6">
            <Kicker>{g.title}</Kicker>
            <BarRows rows={g.rows} label={g.label} />
          </Panel>
        ))}
      </div>
    </section>
  );
}

const COMPLETE_LABEL: Record<string, string> = { language: "Idioma", referer: "Origem do acesso", country: "País", session: "Sessão" };

/** Alertas, resultado dos toques e completude dos dados. */
export function Observability({ stats }: { stats: Stats }) {
  return (
    <section aria-labelledby="obs-title" className="space-y-10">
      <SectionHead id="obs-title" n="04" label="Observabilidade" title="Saúde do cartão" text="O painel confere cada registro de toque e avisa quando algo estranho aparece." />
      <div className="flex flex-wrap gap-4">
        <Panel className="flex-[1.4_1_28rem] space-y-6">
          <Kicker>Alertas</Kicker>
          <ul className="space-y-5">
            {stats.alerts.map((a) => (
              <li key={a.title} className="flex items-start gap-4 border-t border-border pt-5">
                <span className={`mt-2 size-2.5 shrink-0 rounded-full ${a.level === "warn" ? "bg-[oklch(0.82_0.12_85)]" : "bg-success"}`} aria-hidden="true" />
                <div className="space-y-1.5">
                  <p className="font-semibold">{a.title}<span className="sr-only">{a.level === "warn" ? " (atenção)" : ""}</span></p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{a.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="flex-[1_1_20rem] space-y-6">
          <Kicker>Resultado dos toques</Kicker>
          <BarRows rows={stats.outcome} label={outcomeLabel} />
        </Panel>
        <Panel className="flex-[1_1_20rem] space-y-6">
          <Kicker>Dados completos</Kicker>
          <ul className="space-y-5">
            {stats.completeness.map((c) => (
              <li key={c.key} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3 text-[0.95rem]">
                  <span>{COMPLETE_LABEL[c.key] ?? c.key}</span>
                  <span className="tabular-nums text-muted-foreground">{c.filled} de {c.total} · {c.pct}%</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-foreground/10" aria-hidden="true">
                  <div className="h-full rounded-full bg-foreground" style={{ width: `${c.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </section>
  );
}

/** Últimos toques registrados. */
export function RecentTaps({ taps }: { taps: Tap[] }) {
  return (
    <section aria-labelledby="recent-title" className="space-y-10">
      <SectionHead id="recent-title" n="05" label="Registro" title="Últimos toques" />
      <div className="overflow-x-auto rounded-3xl border border-border bg-card">
        <table className="w-full min-w-[60rem] border-collapse text-left text-[0.95rem]">
          <thead>
            <tr className="border-b border-border text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {["Data e hora", "Modo", "Canal", "Aparelho", "Navegador", "País", "Sessão", "Resultado"].map((h) => <th key={h} scope="col" className="whitespace-nowrap px-4 py-5 font-semibold first:pl-8 last:pr-8">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {taps.map((t, i) => {
              const out = tapOutcome(t);
              const src = tapSource(t);
              return (
                <tr key={t.id ?? i} className="border-b border-border/60 last:border-b-0 [&>td]:px-4 [&>td]:py-[1.125rem] [&>td:first-child]:pl-8 [&>td:last-child]:pr-8">
                  <td className="whitespace-nowrap tabular-nums">{formatDateTime(tapTime(t))}</td>
                  <td>{modeLabel(t.mode)}</td>
                  <td>{src ? sourceLabel(src) : "—"}</td>
                  <td>{deviceLabel(t.device_type)}</td>
                  <td className="whitespace-nowrap">{t.browser ?? "—"}</td>
                  <td>{countryName(t.country)}</td>
                  <td className="text-muted-foreground" translate="no">{t.session_id ? t.session_id.slice(0, 8) : "—"}</td>
                  <td>
                    <span className="flex items-center gap-2.5 whitespace-nowrap">
                      <span className={`size-2 shrink-0 rounded-full ${out === "redirect" ? "bg-success" : "bg-[oklch(0.82_0.12_85)]"}`} aria-hidden="true" />
                      {outcomeLabel(out)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

