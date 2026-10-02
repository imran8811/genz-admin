# genz-admin — Gen Z Admin (Menu & Image Management UI)

Angular SPA for managing the **menu source of truth**: categories, menu items, deals and their
**images**. Talks to [`genz-admin-apis`](../genz-admin-apis). Changes made here propagate to
[`genz-web`](../genz-web)/`genz-app` (display) and are synced by `genz-web-apis` (checkout pricing)
and `genz-rms-apis` (costing).

- **Stack:** Angular 21 (standalone + signals), TypeScript 5.9, SCSS, no SSR.
- **API base:** `src/environments/environment.ts` → `http://localhost:8002/api`
  (prod swap via `environment.prod.ts`).
- **Runs on:** `http://localhost:4300` recommended (`ng serve --port 4300`).
- **Brand:** matches genz-web — dark theme, red `#ff1f2d` + yellow `#ffe000`, Anton/Outfit fonts
  (tokens in `src/styles.scss`).

## Run / build
```bash
npm install
npm start                                  # ng serve
npx ng build --configuration development    # fast typecheck build
```

## Structure
- `src/app/core/`: `auth` (Sanctum token in `genz_admin_token`), `auth.interceptor` (bearer + 401→login),
  `auth.guard`, `menu-admin` (categories/items CRUD + image upload + reorder), `models`.
- `src/app/pages/`: `login`, `shell` (sidebar layout), `categories` (CRUD + image + **reorder**),
  `menu-items` (CRUD incl. **deal builder**: pizza selection + deal extras, per-size prices,
  image upload).
- Routing: lazy-loaded standalone components; everything except `/login` is behind `authGuard`.

## Category order (`/categories`) — what customers see first
`categories.sort_order` is what `MenuFeed` orders the public menu by, so this screen decides the
order of the menu on genz-web and genz-app.

- **`⇅ Reorder` is a mode, off by default.** The tiles are normally a navigation grid (a click opens
  the category), and making them `draggable` all the time turns every slightly-dragged click into an
  accidental reorder. In the mode: tiles are draggable, each shows its position number, Edit/Delete
  and the "Open →" hint are swapped for **◀ ▶**, and `open()` returns early so a click does nothing.
- **Drag *and* arrows, deliberately.** Native HTML5 drag-and-drop (no `@angular/cdk` in this project,
  and this needs no dependency); the arrows are what makes it work by keyboard and on a touch
  screen, where HTML5 DnD doesn't fire at all. Both go through one `move(from, to)`.
  - `dragover` **must** `preventDefault()` or the browser treats the tile as an invalid target and no
    `drop` ever fires; `dragstart` must set `dataTransfer` data or Firefox won't start the drag.
- **Moves are staged; `Save order` writes once.** `orderDirty` compares the list against
  `savedOrder` (the order the server last confirmed), so Save is disabled until something actually
  changed and `Cancel` restores from it. Reordering four categories is four moves — posting after
  each would write three orders nobody asked for and leave the list half-arranged if one failed.
- **The array order *is* the order.** The API returns categories by `sort_order` and nothing
  re-sorts them client-side; `saveOrder()` posts `slugs` in array order and then reloads, because
  every `sort_order` held on screen is stale once the server has rewritten them.

## Conventions
- Standalone components + signals; reuse the global tokens/classes in `src/styles.scss`.
- `slug` is shown but **not editable** after creation (immutable shared identity).
- Image upload posts multipart to `/admin/{categories|menu-items}/{slug}/image`; the API normalizes
  to webp at a fixed path and the public feed cache-busts via `?v=`.
