import { modeLabel } from "@/lib/ed";

/** Brilho de quatro pontas usado na página de apresentação do cartão. */
export function Glint({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M12 0c.7 6.2 5.8 11.3 12 12-6.2.7-11.3 5.8-12 12-.7-6.2-5.8-11.3-12-12C6.2 11.3 11.3 6.2 12 0Z" fill="currentColor" />
    </svg>
  );
}

/**
 * A arte do cartão fica em /card-blank.png, idêntica ao cartão impresso, mas sem nome.
 * O nome do titular é escrito por cima, na mesma posição em que a gráfica imprime.
 */
export function PhysicalCard({ label, uid, mode, active }: { label: string; uid: string; mode: string; active: boolean }) {
  const name = label?.trim();
  const hasName = Boolean(name);

  return (
    <figure
      className="@container/card relative isolate m-0 aspect-[1004/638] w-full max-w-[38.75rem] select-none overflow-hidden rounded-[1.4rem] border border-white/15 bg-black"
      aria-label={
        hasName
          ? `Cartão ${name}, identificação ${uid}, modo ${modeLabel(mode)}, ${active ? "ativo" : "pausado"}`
          : `Cartão sem titular, identificação ${uid}, modo ${modeLabel(mode)}, ${active ? "ativo" : "pausado"}`
      }
    >
      <img src="/card-blank.png" alt="" className="absolute inset-0 h-full w-full object-fill" draggable={false} />
      {hasName ? (
        <span
          className="absolute left-[39%] top-[15.4%] max-w-[44%] -translate-y-1/2 truncate font-card text-[4.5cqw] leading-none tracking-[-0.03em] text-white"
          translate="no"
        >
          {name}
        </span>
      ) : null}
      <figcaption className="sr-only">
        {hasName ? `Cartão de ${name}, identificação ${uid}, modo ${modeLabel(mode)}.` : `Cartão sem titular, identificação ${uid}, modo ${modeLabel(mode)}.`} {active ? "Ativo" : "Pausado"}.
      </figcaption>
    </figure>
  );
}
