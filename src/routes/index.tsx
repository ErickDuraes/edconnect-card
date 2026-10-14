import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { sb } from "@/lib/ed";
import { EdLogo } from "@/components/EdLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PhysicalCard, Glint } from "@/components/PhysicalCard";
import { Tilt } from "@/components/Tilt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Erick Durães Connect — Central do cartão" },
      { name: "description", content: "Acesse a central de controle do seu cartão Erick Durães Connect: modos, destinos e interações." },
      { property: "og:title", content: "Erick Durães Connect — Central do cartão" },
      { property: "og:description", content: "Gerencie modos, destinos e interações do seu cartão Erick Durães Connect." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [shake, setShake] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    sb().auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/dashboard", replace: true }); });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    const { error } = await sb().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      setError("E-mail ou senha incorretos. Confira os dados e tente de novo.");
      setShake((n) => n + 1);
      emailRef.current?.focus();
      return;
    }
    setLeaving(true);
    window.setTimeout(() => navigate({ to: "/dashboard", replace: true }), 380);
  }

  const delay = (i: number) => ({ "--i": i }) as React.CSSProperties;

  return (
    <main id="main" className={`relative min-h-dvh overflow-hidden ${leaving ? "leaving" : ""}`}>
      <div className="aurora" aria-hidden="true" />
      <div className="dotgrid absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto grid min-h-dvh max-w-[82rem] items-center gap-12 px-6 pb-12 pt-28 sm:px-10 lg:grid-cols-[1.25fr_1fr] lg:gap-20 lg:px-14 lg:pb-12 lg:pt-32">
        <div className="absolute inset-x-6 top-[max(1.25rem,env(safe-area-inset-top))] flex items-start justify-between sm:inset-x-10 lg:inset-x-14">
          <EdLogo priority className="h-16 sm:h-20" />
          <ThemeToggle />
        </div>

        <section className="space-y-10">
          <div className="space-y-6">
            <h1 className="pb-2 font-display text-[clamp(3rem,5.4vw,4.75rem)] leading-[0.98] tracking-[-0.03em]">
              <span className="word sheen" style={delay(0)}>Um</span>{" "}
              <span className="word sheen" style={delay(1)}>toque.</span>
              <br />
              <span className="word sheen" style={delay(2)}>O</span>{" "}
              <span className="word sheen" style={delay(3)}>destino</span>{" "}
              <span className="word sheen" style={delay(4)}>certo.</span>
            </h1>
            <p className="rise max-w-md text-lg leading-relaxed text-muted-foreground" style={delay(7)}>
              Troque o destino do seu cartão quando quiser e acompanhe cada toque, sem regravar nada.
            </p>
          </div>

          <div className="rise relative hidden max-w-[38.75rem] lg:block" style={delay(9)}>
            <div className="pointer-events-none absolute left-[78%] top-[22%] size-72 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
              <span className="nfc-ring inset-0" style={{ "--d": 0 } as React.CSSProperties} />
              <span className="nfc-ring inset-0" style={{ "--d": 1 } as React.CSSProperties} />
              <span className="nfc-ring inset-0" style={{ "--d": 2 } as React.CSSProperties} />
            </div>
            <div className="float">
              <Tilt className="rounded-[1.4rem] shadow-[0_50px_100px_-40px_oklch(0_0_0/0.9)]">
                <PhysicalCard label="Seu Nome" uid="card_exemplo" mode="perfil" active />
              </Tilt>
            </div>
          </div>
        </section>

        <section className="rise relative mx-auto w-full max-w-md" style={delay(3)}>
          <Glint className="ed-glint absolute -right-3 -top-4 z-10 size-7 text-foreground/80" />
          <form onSubmit={submit} className="glass space-y-7 rounded-[2rem] p-8 sm:p-10">
            <div className="space-y-2">
              <h2 className="text-title">Acesse seu cartão</h2>
              <p className="text-muted-foreground">Entre com o e-mail e a senha que você recebeu.</p>
            </div>

            <div key={shake} className={`space-y-5 ${shake ? "shake" : ""}`}>
              <div className="field space-y-2">
                <Label htmlFor="email" className="text-base">E-mail</Label>
                <div className="relative">
                  <Mail className="field-icon pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    ref={emailRef} id="email" name="email" type="email" inputMode="email"
                    autoComplete="email" spellCheck={false} autoCapitalize="none" required
                    placeholder="voce@empresa.com.br"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="pl-12" aria-invalid={!!error} aria-describedby={error ? "login-error" : undefined}
                  />
                </div>
              </div>

              <div className="field space-y-2">
                <Label htmlFor="password" className="text-base">Senha</Label>
                <div className="relative">
                  <Lock className="field-icon pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="password" name="password" type={show ? "text" : "password"}
                    autoComplete="current-password" spellCheck={false} required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-14" aria-invalid={!!error} aria-describedby={error ? "login-error" : undefined}
                  />
                  <button
                    type="button" onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Ocultar senha" : "Mostrar senha"} aria-pressed={show}
                    className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {show ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
              </div>
            </div>

            <div aria-live="polite">
              {error && <p id="login-error" role="alert" className="pop text-sm text-destructive">{error}</p>}
            </div>

            <Button type="submit" size="lg" className="btn-shine w-full" disabled={busy || leaving}>
              {leaving ? "Abrindo seu painel…" : busy ? "Entrando…" : "Entrar no painel"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">Ainda não tem acesso? Peça ao seu contato na Erick Durães Connect.</p>
          </form>
        </section>
      </div>
    </main>
  );
}
