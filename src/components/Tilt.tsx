import { useRef, type ReactNode } from "react";

/** Inclina o conteúdo em 3D acompanhando o ponteiro e desenha um reflexo. Ignora toque (celular). */
export function Tilt({ children, className = "", max = 9 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  const apply = (el: HTMLElement, vars: Record<string, string>) => {
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.setAttribute("data-hot", "");
      apply(el, {
        "--rx": `${((0.5 - py) * max * 2).toFixed(2)}deg`,
        "--ry": `${((px - 0.5) * max * 2).toFixed(2)}deg`,
        "--gx": `${(px * 100).toFixed(1)}%`,
        "--gy": `${(py * 100).toFixed(1)}%`,
        "--go": "1",
      });
    });
  };

  const onLeave = () => {
    cancelAnimationFrame(raf.current);
    const el = ref.current;
    if (!el) return;
    el.removeAttribute("data-hot");
    apply(el, { "--rx": "0deg", "--ry": "0deg", "--go": "0" });
  };

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={`tilt relative ${className}`}>
      {children}
    </div>
  );
}
