<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
# AGENTS
- Erick Durães Connect panel talks directly to the existing external database via the browser client in src/lib/ed.ts (publishable key, RLS-protected); signed-in pages run client-only (ssr:false) because the session lives in localStorage.
