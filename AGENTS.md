<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Admin access is a shared-password gate (server env `ADMIN_PASSWORD`, encrypted session cookie via `SESSION_SECRET`); every admin read/write goes through `src/lib/admin.functions.ts` server functions using the service-role client after `requireAdmin()`. Why: there are no user accounts, so tables stay closed to the browser by RLS.
- CS portal (`/cs/$token`) has no login; the per-CS `portal_token` in the URL is checked inside SECURITY DEFINER database functions (`cs_*`). Why: staff must reach it instantly from a phone.
- Rotation logic is authoritative in SQL (`public.route_click`, `public.rotation_label`); `src/lib/rotation.ts` only mirrors it for display and tests — change both together. Why: the row lock keeps round-robin correct under concurrent clicks.
- Live updates use a data-free broadcast "doorbell" (`wa-rotator-doorbell`) fired by DB triggers; clients re-fetch through server functions. Why: no table data may be readable by anonymous realtime subscribers.
- The audit log is written by DB triggers on `cs_agents`/`rotator_settings`; any code updating an agent must set `last_actor` and `last_action`. Why: one place records old/new number, status and rotation before/after.
- Phone numbers are stored as digits starting with `62`; normalize with `src/lib/phone.ts` before saving. Why: wa.me links and DB checks require that format.
