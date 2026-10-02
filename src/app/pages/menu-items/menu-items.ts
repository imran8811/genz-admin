import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MenuAdminService } from '../../core/menu-admin';
import { Category, MenuItem, isDealGroup } from '../../core/models';

@Component({
  selector: 'app-menu-items',
  imports: [FormsModule, RouterLink],
  template: `
    <header class="head">
      <div class="title">
        <a class="back" routerLink="/categories">← Categories</a>
        <h1>{{ activeCategory()?.name ?? '…' }}</h1>
      </div>
      <button class="btn btn-primary" (click)="openNew()" [disabled]="!activeCategory()">+ Add new item</button>
    </header>

    @if (loadError()) {
      <p class="err">{{ loadError() }}</p>
    }

    @if (activeCategory()) {
      <div class="grid">
        @for (it of items(); track it.slug) {
          <div class="card item-card">
            <div class="thumb-wrap">
              @if (img(it); as src) {
                <img class="thumb" [src]="src" alt="" />
              } @else {
                <div class="thumb empty">no image</div>
              }
            </div>
            <div class="body">
              <div class="name">
                {{ it.name }}
                @if (!it.is_active) {
                  <span class="tag">inactive</span>
                }
                @if (it.is_special) {
                  <span class="tag yellow">special</span>
                }
                @if (it.is_signature) {
                  <span class="tag yellow">signature</span>
                }
              </div>
              @if (it.description) {
                <p class="desc">{{ it.description }}</p>
              }
              <div class="price muted">{{ priceLabel(it) }}</div>
            </div>
            <div class="actions">
              <label class="btn btn-ghost btn-sm" title="Update image">
                🖼 Image
                <input type="file" accept="image/*" hidden (change)="upload(it, $event)" />
              </label>
              <button class="btn btn-ghost btn-sm" title="Edit details" (click)="openEdit(it)">✎ Edit</button>
              <button class="btn btn-danger btn-sm" title="Delete" (click)="remove(it)">🗑 Delete</button>
            </div>
          </div>
        } @empty {
          @if (!loadError()) {
            @if (!itemsLoaded()) {
              <p class="muted">Loading…</p>
            } @else if (allItems().length) {
              <p class="err">
                Loaded {{ allItems().length }} items, but none are linked to this category
                (id {{ activeCategory()?.id }}). The menu data looks inconsistent.
              </p>
            } @else {
              <p class="muted">No items in this category yet.</p>
            }
          }
        }
      </div>
    } @else if (!loadError()) {
      <p class="muted">{{ categoriesLoaded() ? 'That category no longer exists.' : 'Loading…' }}</p>
    }

    @if (editing()) {
      <div class="overlay" (click)="cancel()">
        <form class="card modal" (click)="$event.stopPropagation()" (ngSubmit)="save()">
          <h2>{{ current().slug ? 'Edit' : 'New' }} {{ isDeal(activeSlug()) ? 'deal' : 'item' }}</h2>

          <div class="field">
            <label>Name</label>
            <input name="name" [(ngModel)]="f.name" required />
          </div>
          <div class="field">
            <label>Slug</label>
            @if (current().slug; as slug) {
              <input [value]="slug" disabled title="A slug is permanent once the item exists" />
            } @else {
              <input name="slug" [(ngModel)]="f.slug" [placeholder]="slugify(f.name) || 'generated from the name'" />
              <small class="muted">Permanent once saved. Leave blank to use the placeholder; set one if that slug is taken.</small>
            }
          </div>
          <div class="field">
            <label>Description</label>
            <textarea name="desc" rows="2" [(ngModel)]="f.description"></textarea>
          </div>

          @if (activeCategory()?.type === 'sized') {
            <label>Prices</label>
            <div class="prices">
              @for (size of activeCategory()?.sizes ?? []; track size) {
                <div class="price-cell">
                  <span class="muted">{{ size }}</span>
                  <input type="number" min="0" [ngModel]="f.prices[size]" (ngModelChange)="f.prices[size] = $event" [name]="'p_' + size" />
                </div>
              }
            </div>
          } @else {
            <div class="field">
              <label>Price (Rs)</label>
              <input type="number" min="0" name="price" [(ngModel)]="f.price" />
            </div>
          }

          <div class="field">
            <label>Tag (optional)</label>
            <input name="tag" [(ngModel)]="f.tag" placeholder="e.g. Best value" />
          </div>

          @if (isDeal(activeSlug())) {
            <div class="field">
              <label>Deal extras (comma separated)</label>
              <input name="extras" [(ngModel)]="f.dealExtrasCsv" placeholder="Drink 345ml, Fries" />
            </div>
            <label class="chk"><input type="checkbox" name="reqsel" [(ngModel)]="f.requiresSelection" /> Customer picks items (e.g. pizza)</label>
            @if (f.requiresSelection) {
              <div class="sel-grid">
                <div class="field">
                  <label>Pick size</label>
                  <input name="selsize" [(ngModel)]="f.selSize" placeholder="Small" />
                </div>
                <div class="field">
                  <label>How many</label>
                  <input type="number" min="1" name="selcount" [(ngModel)]="f.selCount" />
                </div>
              </div>
              <div class="field">
                <label>Choose from</label>
                <div class="pick">
                  @for (g of pickableGroups(); track g.cat.slug) {
                    <details [open]="openGroups.has(g.cat.slug)">
                      <summary>
                        <span class="pick-name">{{ g.cat.name }}</span>
                        <span class="muted">{{ selectedIn(g.items) }}/{{ g.items.length }}</span>
                        <button type="button" class="btn btn-ghost btn-sm" (click)="toggleGroup(g.items, $event)">
                          {{ selectedIn(g.items) === g.items.length ? 'None' : 'All' }}
                        </button>
                      </summary>
                      @for (opt of g.items; track opt.slug) {
                        <label class="chk">
                          <input type="checkbox" [checked]="f.selFrom.includes(opt.slug)" (change)="toggleSel(opt.slug)" />
                          {{ opt.name }}
                        </label>
                      }
                    </details>
                  }
                </div>
              </div>
            }
          }

          <div class="row2">
            <label class="chk"><input type="checkbox" name="active" [(ngModel)]="f.is_active" /> Active</label>
            <label class="chk"><input type="checkbox" name="special" [(ngModel)]="f.is_special" /> Special</label>
            <label class="chk"><input type="checkbox" name="sig" [(ngModel)]="f.is_signature" /> Signature</label>
          </div>

          @if (error()) {
            <p class="err">{{ error() }}</p>
          }
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" (click)="cancel()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: [
    `
      .head {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-bottom: 22px;
        gap: 16px;
      }
      .back {
        display: inline-block;
        font-size: 12px;
        font-weight: 600;
        color: var(--muted);
        margin-bottom: 6px;
      }
      .back:hover {
        color: var(--yellow);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 14px;
      }
      .item-card {
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .thumb-wrap {
        height: 140px;
        background: var(--surface-2);
      }
      .thumb {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .thumb.empty {
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
        font-size: 12px;
        color: var(--muted);
      }
      .body {
        padding: 12px 14px 6px;
        flex: 1;
      }
      .name {
        font-weight: 700;
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
      }
      .desc {
        color: var(--muted);
        font-size: 13px;
        margin: 6px 0 0;
        line-height: 1.4;
      }
      .price {
        font-size: 12px;
        margin-top: 8px;
      }
      .actions {
        display: flex;
        gap: 6px;
        padding: 10px 12px 12px;
        border-top: 1px solid var(--border);
      }
      .btn-sm {
        padding: 6px 9px;
        font-size: 12px;
        flex: 1;
        justify-content: center;
      }
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        display: grid;
        place-items: center;
        padding: 20px;
        z-index: 10;
      }
      .modal {
        width: 100%;
        max-width: 480px;
        padding: 24px;
        max-height: 90vh;
        overflow: auto;
      }
      .modal h2 {
        margin-bottom: 18px;
      }
      .prices {
        display: flex;
        gap: 10px;
        margin-bottom: 14px;
        flex-wrap: wrap;
      }
      .price-cell {
        flex: 1;
        min-width: 90px;
      }
      .price-cell span {
        display: block;
        font-size: 11px;
        margin-bottom: 4px;
      }
      .sel-grid {
        display: flex;
        gap: 12px;
      }
      .pick {
        max-height: 260px;
        overflow-y: auto;
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 4px 10px;
      }
      .pick summary {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 0;
        cursor: pointer;
      }
      .pick-name {
        flex: 1;
        font-weight: 600;
      }
      .pick .chk {
        padding-left: 14px;
      }
      .row2 {
        display: flex;
        gap: 18px;
        flex-wrap: wrap;
        margin-top: 6px;
      }
      .chk {
        display: flex;
        align-items: center;
        gap: 7px;
        text-transform: none;
        letter-spacing: 0;
        color: var(--text);
        font-size: 14px;
        margin-bottom: 6px;
      }
      .chk input {
        width: auto;
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 18px;
      }
      .err {
        color: #ff6b73;
        font-size: 13px;
      }
    `,
  ],
})
export class MenuItemsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(MenuAdminService);

  categories = signal<Category[]>([]);
  allItems = signal<MenuItem[]>([]);
  activeSlug = signal<string>('');
  editing = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  loadError = signal<string | null>(null);
  categoriesLoaded = signal(false);
  itemsLoaded = signal(false);
  current = signal<MenuItem | Partial<MenuItem>>({});

  activeCategory = computed(() => this.categories().find((c) => c.slug === this.activeSlug()) ?? null);
  items = computed(() => {
    const cat = this.activeCategory();
    // Compare ids numerically: a JSON id can arrive as a string (PDO with
    // emulated prepares does this), and `'3' === 3` would silently match
    // nothing at all.
    return cat ? this.allItems().filter((i) => Number(i.category_id) === Number(cat.id)) : [];
  });
  /**
   * What a deal can let the customer choose from: the non-deal categories, each with its items,
   * both in menu order (categories arrive by sort_order; items are sorted here).
   */
  pickableGroups = computed(() =>
    this.categories()
      .filter((c) => !isDealGroup(c.slug))
      .map((cat) => ({
        cat,
        items: this.allItems()
          .filter((i) => Number(i.category_id) === Number(cat.id))
          .sort((a, b) => a.sort_order - b.sort_order),
      }))
      .filter((g) => g.items.length > 0),
  );
  /**
   * Picker groups expanded when the modal opens. Fixed at open time so that ticking an item
   * never opens or closes a group under the user's cursor.
   */
  openGroups = new Set<string>();

  f = this.blank();
  isDeal = isDealGroup;

  ngOnInit(): void {
    this.route.paramMap.subscribe((p) => this.activeSlug.set(p.get('slug') ?? ''));
    this.api.categories().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.categoriesLoaded.set(true);
      },
      error: (err) => this.loadError.set(this.loadFailure('categories', err)),
    });
    this.loadItems();
  }

  loadItems(): void {
    // Without an error branch a failed request just leaves the list empty, and
    // the template then claims the category has no items — a different thing
    // entirely. Surface the failure instead of quietly showing nothing.
    this.api.items().subscribe({
      next: (items) => {
        this.allItems.set(items);
        this.itemsLoaded.set(true);
        this.loadError.set(null);
      },
      error: (err) => this.loadError.set(this.loadFailure('items', err)),
    });
  }

  /** Why a list request failed, in words — including the HTTP status. */
  private loadFailure(what: string, err: { status?: number; message?: string }): string {
    const status = err?.status;
    const detail =
      status === 0 ? 'could not reach the API (network, CORS, or the server is down)'
      : status === 401 ? 'the session is not valid for this API — sign in again'
      : status ? `the API answered HTTP ${status}`
      : (err?.message ?? 'unknown error');
    return `Could not load ${what}: ${detail}.`;
  }

  img(it: MenuItem): string | null {
    // Numeric compare for the same string-id reason as items().
    const cat = this.categories().find((c) => Number(c.id) === Number(it.category_id));
    return cat ? this.api.imageUrl(cat.slug, it.slug, it.image_updated_at) : null;
  }

  priceLabel(it: MenuItem): string {
    if (it.price_type === 'sized' && it.prices) {
      return Object.entries(it.prices)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `${k} Rs${v}`)
        .join(' · ');
    }
    return it.price != null ? `Rs${it.price}` : '—';
  }

  openNew(): void {
    this.current.set({});
    this.f = this.blank();
    // Every pizza deal has the customer pick their pizzas, so open the picker
    // (size / how many / choose from) up front instead of behind the checkbox.
    const slug = this.activeSlug();
    this.f.requiresSelection = isDealGroup(slug) && slug.includes('pizza');
    this.initOpenGroups();
    this.error.set(null);
    this.editing.set(true);
  }

  openEdit(it: MenuItem): void {
    this.current.set(it);
    this.f = {
      name: it.name,
      slug: it.slug,
      description: it.description ?? '',
      price: it.price,
      prices: { ...(it.prices ?? {}) },
      tag: it.tag ?? '',
      is_active: it.is_active,
      is_special: it.is_special,
      is_signature: it.is_signature,
      dealExtrasCsv: (it.deal_extras ?? []).join(', '),
      requiresSelection: !!it.pizza_selection,
      selSize: it.pizza_selection?.size ?? '',
      selCount: it.pizza_selection?.count ?? 1,
      selFrom: it.pizza_selection?.from ?? [],
    };
    this.initOpenGroups();
    this.error.set(null);
    this.editing.set(true);
  }

  cancel(): void {
    this.editing.set(false);
  }

  /**
   * Expand the groups worth looking at first: any that already holds a pick, plus pizza
   * categories when this is a pizza deal. If none qualify, expand everything rather than
   * show a picker with every group closed.
   */
  private initOpenGroups(): void {
    const pizzaDeal = this.activeSlug().includes('pizza');
    const groups = this.pickableGroups();
    const open = groups.filter(
      (g) => this.selectedIn(g.items) > 0 || (pizzaDeal && g.cat.slug.includes('pizza')),
    );
    this.openGroups = new Set((open.length ? open : groups).map((g) => g.cat.slug));
  }

  selectedIn(items: MenuItem[]): number {
    return items.filter((i) => this.f.selFrom.includes(i.slug)).length;
  }

  toggleSel(slug: string): void {
    const from = this.f.selFrom;
    this.f.selFrom = from.includes(slug) ? from.filter((s) => s !== slug) : [...from, slug];
  }

  /** All/None for one category; picks in other categories are left alone. */
  toggleGroup(items: MenuItem[], ev: Event): void {
    ev.preventDefault(); // the button sits in <summary>; don't also fold the group
    const slugs = items.map((i) => i.slug);
    const rest = this.f.selFrom.filter((s) => !slugs.includes(s));
    this.f.selFrom = this.selectedIn(items) === items.length ? rest : [...rest, ...slugs];
  }

  save(): void {
    const cat = this.activeCategory();
    if (!cat) return;
    this.saving.set(true);
    this.error.set(null);

    const payload: Partial<MenuItem> = {
      category_id: cat.id,
      name: this.f.name,
      description: this.f.description || null,
      price_type: cat.type,
      tag: this.f.tag || null,
      is_active: this.f.is_active,
      is_special: this.f.is_special,
      is_signature: this.f.is_signature,
    };

    if (cat.type === 'sized') {
      const prices: Record<string, number | null> = {};
      for (const size of cat.sizes ?? []) {
        const v = this.f.prices[size];
        prices[size] = v === undefined || v === null || (v as unknown) === '' ? null : Number(v);
      }
      payload.prices = prices;
    } else {
      payload.price = this.f.price != null ? Number(this.f.price) : null;
    }

    if (isDealGroup(cat.slug)) {
      payload.deal_extras = this.f.dealExtrasCsv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      payload.pizza_selection = this.f.requiresSelection
        ? { size: this.f.selSize, count: Number(this.f.selCount), from: this.f.selFrom }
        : null;
    }

    const slug = this.current().slug;
    if (!slug && this.f.slug.trim()) payload.slug = this.slugify(this.f.slug);
    const req = slug ? this.api.updateItem(slug, payload) : this.api.createItem(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.loadItems();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(this.firstError(err) ?? 'Save failed.');
      },
    });
  }

  remove(it: MenuItem): void {
    if (!confirm(`Delete "${it.name}"?`)) return;
    this.api.deleteItem(it.slug).subscribe({ next: () => this.loadItems() });
  }

  upload(it: MenuItem, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // let the same file be picked again after a failure
    if (!file) return;
    this.api.uploadItemImage(it.slug, file).subscribe({
      next: () => this.loadItems(),
      error: (err) => alert(`Image upload failed: ${err?.error?.message ?? `HTTP ${err?.status}`}`),
    });
  }

  /** Lowercase-hyphen form, matching the API's Str::slug() for plain names. */
  slugify(s: string): string {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private blank() {
    return {
      name: '',
      slug: '',
      description: '',
      price: null as number | null,
      prices: {} as Record<string, number | null>,
      tag: '',
      is_active: true,
      is_special: false,
      is_signature: false,
      dealExtrasCsv: '',
      requiresSelection: false,
      selSize: '',
      selCount: 1,
      selFrom: [] as string[],
    };
  }

  private firstError(err: { error?: { errors?: Record<string, string[]>; message?: string } }): string | null {
    const errs = err?.error?.errors;
    if (errs) return Object.values(errs)[0]?.[0] ?? null;
    return err?.error?.message ?? null;
  }
}
