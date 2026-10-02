import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuAdminService } from '../../core/menu-admin';
import { Category } from '../../core/models';

interface CatForm {
  name: string;
  type: 'single' | 'sized';
  sizesCsv: string;
  is_coming_soon: boolean;
  is_active: boolean;
}

@Component({
  selector: 'app-categories',
  imports: [FormsModule],
  template: `
    <header class="head">
      <h1>Categories</h1>
      <div class="head-actions">
        @if (reordering()) {
          <button class="btn btn-ghost" (click)="cancelReorder()" [disabled]="savingOrder()">
            Cancel
          </button>
          <button
            class="btn btn-primary"
            (click)="saveOrder()"
            [disabled]="savingOrder() || !orderDirty()"
          >
            {{ savingOrder() ? 'Saving…' : 'Save order' }}
          </button>
        } @else {
          <button
            class="btn btn-ghost"
            (click)="startReorder()"
            [disabled]="categories().length < 2"
            title="Drag the categories into the order customers should see"
          >
            ⇅ Reorder
          </button>
          <button class="btn btn-primary" (click)="openNew()">+ New category</button>
        }
      </div>
    </header>

    @if (reordering()) {
      <p class="note">
        Drag a tile, or use ◀ ▶, to set the order customers see on the menu. Nothing is saved until
        you press <strong>Save order</strong>.
      </p>
    }
    @if (orderError()) {
      <p class="err">{{ orderError() }}</p>
    }

    @if (loading()) {
      <p class="muted">Loading…</p>
    }

    <div class="grid">
      @for (c of categories(); track c.slug; let i = $index) {
        <div
          class="tile card"
          [class.arranging]="reordering()"
          [class.dragging]="dragIndex() === i"
          [class.drop-target]="dragOverIndex() === i && dragIndex() !== i"
          [attr.draggable]="reordering() ? true : null"
          (click)="open(c)"
          (dragstart)="onDragStart(i, $event)"
          (dragover)="onDragOver(i, $event)"
          (drop)="onDrop(i, $event)"
          (dragend)="onDragEnd()"
        >
          <div class="tile-head">
            <h3>
              @if (reordering()) {
                <span class="pos">{{ i + 1 }}</span>
              }
              {{ c.name }}
            </h3>
            <div class="tile-actions" (click)="$event.stopPropagation()">
              @if (reordering()) {
                <button
                  class="icon"
                  title="Move earlier"
                  [disabled]="i === 0"
                  (click)="move(i, i - 1)"
                >
                  ◀
                </button>
                <button
                  class="icon"
                  title="Move later"
                  [disabled]="i === categories().length - 1"
                  (click)="move(i, i + 1)"
                >
                  ▶
                </button>
              } @else {
                <button class="icon" title="Edit category" (click)="openEdit(c)">✎</button>
                <button class="icon danger" title="Delete category" (click)="remove(c)">🗑</button>
              }
            </div>
          </div>
          <div class="meta muted">
            {{ c.menu_items_count ?? 0 }} items · {{ c.type }}
            @if (!c.is_active) {
              <span class="tag">inactive</span>
            }
            @if (c.is_coming_soon) {
              <span class="tag yellow">coming soon</span>
            }
          </div>
          @if (!reordering()) {
            <span class="open-hint muted">Open →</span>
          }
        </div>
      } @empty {
        @if (!loading()) {
          <p class="muted">No categories yet — create one to get started.</p>
        }
      }
    </div>

    @if (editing()) {
      <div class="overlay" (click)="cancel()">
        <form class="card modal" (click)="$event.stopPropagation()" (ngSubmit)="save()">
          <h2>{{ current().slug ? 'Edit category' : 'New category' }}</h2>

          <div class="field">
            <label>Name</label>
            <input name="name" [(ngModel)]="form.name" required />
          </div>
          <div class="field">
            <label>Type</label>
            <select name="type" [(ngModel)]="form.type">
              <option value="single">Single price</option>
              <option value="sized">Sized (per-size prices)</option>
            </select>
          </div>
          @if (form.type === 'sized') {
            <div class="field">
              <label>Sizes (comma separated)</label>
              <input name="sizes" [(ngModel)]="form.sizesCsv" placeholder="Small, Medium, Large" />
            </div>
          }
          <div class="row2">
            <label class="chk"><input type="checkbox" name="active" [(ngModel)]="form.is_active" /> Active</label>
            <label class="chk"
              ><input type="checkbox" name="soon" [(ngModel)]="form.is_coming_soon" /> Coming soon</label
            >
          </div>

          @if (error()) {
            <p class="err">{{ error() }}</p>
          }
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" (click)="cancel()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving()">
              {{ saving() ? 'Saving…' : 'Save' }}
            </button>
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
        align-items: center;
        margin-bottom: 22px;
      }
      .head-actions {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .note {
        font-size: 13px;
        color: var(--muted);
        border: 1px dashed var(--border);
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 14px;
      }
      .note strong {
        color: var(--text);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        gap: 14px;
      }
      .tile {
        padding: 16px 16px 14px;
        cursor: pointer;
        position: relative;
        transition:
          border-color 0.15s,
          transform 0.05s;
      }
      .tile:hover {
        border-color: var(--red);
      }
      .tile:active {
        transform: translateY(1px);
      }
      /* Arranging: the tile is a handle, not a link. */
      .tile.arranging {
        cursor: grab;
      }
      .tile.arranging:active {
        cursor: grabbing;
        transform: none;
      }
      .tile.dragging {
        opacity: 0.4;
      }
      .tile.drop-target {
        border-color: var(--yellow);
        outline: 2px dashed var(--yellow);
        outline-offset: 2px;
      }
      .pos {
        display: inline-grid;
        place-items: center;
        min-width: 22px;
        height: 22px;
        margin-right: 6px;
        padding: 0 5px;
        border-radius: 6px;
        background: var(--surface-2);
        border: 1px solid var(--border);
        color: var(--muted);
        font-size: 11px;
        font-weight: 700;
        vertical-align: middle;
      }
      .icon:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
      .tile-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
      }
      .tile-head h3 {
        font-size: 1.05rem;
      }
      .tile-actions {
        display: flex;
        gap: 4px;
      }
      .icon {
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--muted);
        width: 28px;
        height: 28px;
        font-size: 13px;
      }
      .icon:hover {
        color: var(--text);
        border-color: var(--muted);
      }
      .icon.danger:hover {
        color: #ff6b73;
        border-color: #5a2327;
      }
      .meta {
        font-size: 12px;
        margin-top: 8px;
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
      }
      .open-hint {
        display: block;
        margin-top: 14px;
        font-size: 12px;
        font-weight: 600;
        color: var(--yellow);
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
        max-width: 440px;
        padding: 24px;
      }
      .modal h2 {
        margin-bottom: 18px;
      }
      .row2 {
        display: flex;
        gap: 18px;
      }
      .chk {
        display: flex;
        align-items: center;
        gap: 7px;
        text-transform: none;
        letter-spacing: 0;
        color: var(--text);
        font-size: 14px;
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
export class CategoriesComponent implements OnInit {
  categories = signal<Category[]>([]);
  loading = signal(false);
  editing = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  current = signal<Category | Partial<Category>>({});
  form: CatForm = this.blank();

  // ---- Reordering ----
  // Off by default: the tiles are normally a navigation grid (click opens the
  // category), and making them draggable all the time turns every slightly
  // dragged click into an accidental reorder. The toggle swaps the grid into an
  // arrange-only mode, where clicking a tile does nothing.
  reordering = signal(false);
  savingOrder = signal(false);
  orderError = signal<string | null>(null);

  /** The order the server last confirmed, for dirty-checking and Cancel. */
  private readonly savedOrder = signal<string[]>([]);

  /** Index being dragged, and the tile it is currently over. */
  dragIndex = signal<number | null>(null);
  dragOverIndex = signal<number | null>(null);

  /**
   * Moves are staged and written once by **Save order** — a drag is not an API
   * call. Reordering four categories is four moves, and posting after each one
   * would write three orders nobody asked for and leave the list half-arranged
   * if one failed.
   */
  readonly orderDirty = computed(() => {
    const now = this.categories().map((c) => c.slug);
    const saved = this.savedOrder();

    return now.length !== saved.length || now.some((s, i) => s !== saved[i]);
  });

  constructor(
    private api: MenuAdminService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.categories().subscribe({
      next: (c) => {
        // The API returns them by `sort_order`, so the array order *is* the
        // order — the whole feature rests on not re-sorting it anywhere else.
        this.categories.set(c);
        this.savedOrder.set(c.map((x) => x.slug));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Open a category's items. Inert while arranging — the tile is a handle then. */
  open(c: Category): void {
    if (this.reordering()) return;
    this.router.navigate(['/category', c.slug]);
  }

  // ---- Reordering ----

  startReorder(): void {
    this.orderError.set(null);
    this.reordering.set(true);
  }

  /** Put the list back the way the server has it and leave the mode. */
  cancelReorder(): void {
    const bySlug = new Map(this.categories().map((c) => [c.slug, c]));
    this.categories.set(
      this.savedOrder()
        .map((slug) => bySlug.get(slug))
        .filter((c): c is Category => !!c),
    );
    this.dragIndex.set(null);
    this.dragOverIndex.set(null);
    this.orderError.set(null);
    this.reordering.set(false);
  }

  /** Move one tile to a new index, clamped. Used by both the arrows and drops. */
  move(from: number, to: number): void {
    const list = [...this.categories()];
    if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return;
    const [picked] = list.splice(from, 1);
    list.splice(to, 0, picked);
    this.categories.set(list);
  }

  onDragStart(index: number, ev: DragEvent): void {
    this.dragIndex.set(index);
    // Firefox refuses to start a drag unless some data is set.
    ev.dataTransfer?.setData('text/plain', String(index));
    if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
  }

  onDragOver(index: number, ev: DragEvent): void {
    if (this.dragIndex() === null) return;
    // Without preventDefault the browser treats the tile as an invalid target
    // and never fires a drop.
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
    this.dragOverIndex.set(index);
  }

  onDrop(index: number, ev: DragEvent): void {
    ev.preventDefault();
    const from = this.dragIndex();
    if (from !== null) this.move(from, index);
    this.onDragEnd();
  }

  onDragEnd(): void {
    this.dragIndex.set(null);
    this.dragOverIndex.set(null);
  }

  /** One POST with the whole list; the endpoint rewrites `sort_order` from it. */
  saveOrder(): void {
    const slugs = this.categories().map((c) => c.slug);
    this.savingOrder.set(true);
    this.orderError.set(null);
    this.api.reorderCategories(slugs).subscribe({
      next: () => {
        this.savingOrder.set(false);
        this.savedOrder.set(slugs);
        this.reordering.set(false);
        // Re-read: every `sort_order` on screen is now stale, and the server's
        // order is the one the public menu feed will publish.
        this.load();
      },
      error: (err) => {
        this.savingOrder.set(false);
        this.orderError.set(this.firstError(err) ?? 'Could not save the new order.');
      },
    });
  }

  openNew(): void {
    this.current.set({});
    this.form = this.blank();
    this.error.set(null);
    this.editing.set(true);
  }

  openEdit(c: Category): void {
    this.current.set(c);
    this.form = {
      name: c.name,
      type: c.type,
      sizesCsv: (c.sizes ?? []).join(', '),
      is_coming_soon: c.is_coming_soon,
      is_active: c.is_active,
    };
    this.error.set(null);
    this.editing.set(true);
  }

  cancel(): void {
    this.editing.set(false);
  }

  save(): void {
    this.saving.set(true);
    this.error.set(null);
    const payload: Partial<Category> = {
      name: this.form.name,
      type: this.form.type,
      sizes:
        this.form.type === 'sized'
          ? this.form.sizesCsv
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : null,
      is_coming_soon: this.form.is_coming_soon,
      is_active: this.form.is_active,
    };
    const slug = this.current().slug;
    const req = slug ? this.api.updateCategory(slug, payload) : this.api.createCategory(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(this.firstError(err) ?? 'Save failed.');
      },
    });
  }

  remove(c: Category): void {
    if (!confirm(`Delete category "${c.name}" and its items?`)) return;
    this.api.deleteCategory(c.slug).subscribe({ next: () => this.load() });
  }

  private blank(): CatForm {
    return { name: '', type: 'single', sizesCsv: '', is_coming_soon: false, is_active: true };
  }

  private firstError(err: { error?: { errors?: Record<string, string[]>; message?: string } }): string | null {
    const errs = err?.error?.errors;
    if (errs) return Object.values(errs)[0]?.[0] ?? null;
    return err?.error?.message ?? null;
  }
}
