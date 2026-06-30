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
- `src/app/pages/`: `login`, `shell` (sidebar layout), `categories` (CRUD + image), `menu-items`
  (CRUD incl. **deal builder**: pizza selection + deal extras, per-size prices, image upload).
- Routing: lazy-loaded standalone components; everything except `/login` is behind `authGuard`.

## Conventions
- Standalone components + signals; reuse the global tokens/classes in `src/styles.scss`.
- `slug` is shown but **not editable** after creation (immutable shared identity).
- Image upload posts multipart to `/admin/{categories|menu-items}/{slug}/image`; the API normalizes
  to webp at a fixed path and the public feed cache-busts via `?v=`.
