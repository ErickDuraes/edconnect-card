import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useTheme } from "@/components/theme-context";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="max-w-xl">
        <p className="text-display text-foreground">404</p>
        <h1 className="mt-6 text-title">Esta página não existe</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          O endereço pode ter mudado ou estar digitado errado. Volte ao início para entrar no
          painel.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/85"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="max-w-xl">
        <h1 className="text-title">Não foi possível carregar</h1>
        <p className="mt-4 text-lg text-muted-foreground" role="alert">
          Algo deu errado do nosso lado. Tente de novo; se continuar, volte ao início e entre outra
          vez.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/85"
          >
            Tentar de novo
          </button>
          <a
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-full bg-secondary px-8 text-base font-semibold text-secondary-foreground transition-colors hover:bg-accent"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#030303" },
      { name: "color-scheme", content: "light dark" },
      { name: "author", content: "Erick Durães Connect" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Manrope:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Ir para o conteúdo
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <ThemeAwareToaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function ThemeAwareToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      position="bottom-center"
      offset="max(1rem, env(safe-area-inset-bottom))"
    />
  );
}
