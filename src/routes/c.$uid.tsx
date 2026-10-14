import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { sb, destinationOf, modeLabel, isValidHttpUrl, type CardMode } from "@/lib/ed";
import { EdLogo } from "@/components/EdLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Glint } from "@/components/PhysicalCard";

export const Route = createFileRoute("/c/$uid")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Cartão Erick Durães Connect" },
      { name: "description", content: "Perfil e contatos compartilhados por um cartão Erick Durães Connect." },
      { property: "og:title", content: "Cartão Erick Durães Connect" },
      { property: "og:description", content: "Perfil e contatos compartilhados por um cartão Erick Durães Connect." },
      { property: "og:type", content: "profile" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicCard,
});

type State = { status: "loading" } | { status: "missing"; title: string; msg: string } | { status: "ok"; label: string; mode: string; config: Record<string, string> };

function PublicCard() {
  const { uid } = Route.useParams();
  const [s, setS] = useState<State>({ status: "loading" });

  useEffect(() => {
    (async () => {
      const { data: card, error } = await sb().from("cards").select("id, uid, label, active_mode, is_active").eq("uid", uid.trim()).maybeSingle();
      if (error || !card) return setS({ status: "missing", title: "Cartão não encontrado", msg: "Confira se o cartão foi encostado de novo ou se o link foi copiado por inteiro. Se o problema continuar, fale com quem te entregou o cartão." });
      if (!card.is_active) return setS({ status: "missing", title: "Cartão pausado", msg: "O titular pausou este cartão por enquanto. Tente de novo mais tarde ou fale com ele por outro canal." });
      const { data: m } = await sb().from("card_modes").select("mode, is_enabled, config").eq("card_id", card.id).eq("mode", card.active_mode).maybeSingle();
      const rec = m as Pick<CardMode, "mode" | "is_enabled" | "config"> | null;
      // Registra o toque no servidor (Vercel) antes do redirecionamento. Falha aqui nunca bloqueia.
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 1500);
        await fetch(`/api/cards/${encodeURIComponent(uid.trim())}/tap`, { method: "POST", keepalive: true, signal: ctrl.signal });
        clearTimeout(t);
      } catch { /* ignora */ }
      setS({ status: "ok", label: card.label || "", mode: card.active_mode, config: rec?.is_enabled ? rec.config || {} : {} });
    })();
  }, [uid]);

  return (
    <main id="main" className="min-h-dvh flex flex-col px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-10">
      <header className="flex items-center justify-between">
        <EdLogo priority className="h-20 sm:h-24" />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Glint className="h-6 w-6 text-foreground" />
        </div>
      </header>

      <div className="flex flex-1 flex-col justify-center py-12 max-w-2xl" aria-live="polite" aria-busy={s.status === "loading"}>
        {s.status === "loading" && (
          <div className="space-y-6" role="status">
            <span className="sr-only">Abrindo o cartão…</span>
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-14 w-full max-w-sm rounded-full" />
          </div>
        )}
        {s.status === "missing" && (
          <div className="rise space-y-5">
            <h1 className="sheen pb-1 text-title">{s.title}</h1>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">{s.msg}</p>
          </div>
        )}
        {s.status === "ok" && <Profile {...s} />}
      </div>

      <footer className="text-sm text-muted-foreground">
        <span translate="no">Erick Durães Connect</span> · Um toque, o destino certo.
      </footer>
    </main>
  );
}

function Profile({ label, mode, config }: { label: string; mode: string; config: Record<string, string> }) {
  const hubUrl = String(config["url"] || "");
  const redirecting = mode === "perfil" && isValidHttpUrl(hubUrl);
  useEffect(() => {
    if (redirecting) window.location.replace(hubUrl);
  }, [redirecting, hubUrl]);

  if (redirecting) {
    return (
      <div className="rise space-y-5">
        <h1 className="sheen pb-1 text-title">Abrindo o destino…</h1>
        <p className="text-lg text-muted-foreground">
          Se nada acontecer em alguns segundos, <a href={hubUrl} rel="noopener noreferrer" className="text-foreground underline underline-offset-4">toque aqui para abrir</a>.
        </p>
      </div>
    );
  }
  const name = config["name"] || label || "Erick Durães Connect";
  const href = mode !== "perfil" ? destinationOf(mode, config) : "";
  return (
    <div className="space-y-8">
      <h1 className="rise sheen pb-2 text-display break-words" translate="no">{name}</h1>
      {href ? (
        <div className="rise space-y-3" style={{ "--i": 1 } as React.CSSProperties}>
          <Button asChild size="lg" className="w-full sm:w-auto sm:min-w-72">
            <a href={href} rel="noopener noreferrer">Abrir {modeLabel(mode)}</a>
          </Button>
        </div>
      ) : (
        <p className="rise max-w-md text-lg leading-relaxed text-muted-foreground" style={{ "--i": 1 } as React.CSSProperties}>
          O titular ainda não definiu para onde este cartão leva. Tente de novo mais tarde.
        </p>
      )}
    </div>
  );
}
