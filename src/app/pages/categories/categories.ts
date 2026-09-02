import { Component, OnInit, signal } from '@angular/core';
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
      <button class="btn btn-primary" (click)="openNew()">+ New category</button>
    </header>

    @if (loading()) {
      <p class="muted">Loading…</p>
    }

    <div class="grid">
      @for (c of categories(); track c.slug) {
        <div class="tile card" (click)="open(c)">
          <div class="tile-head">
            <h3>{{ c.name }}</h3>
            <div class="tile-actions" (click)="$event.stopPropagation()">
              <button class="icon" title="Edit category" (click)="openEdit(c)">✎</button>
              <button class="icon danger" title="Delete category" (click)="remove(c)">🗑</button>
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
          <span class="open-hint muted">Open →</span>
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
        this.categories.set(c);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Open a category's items. */
  open(c: Category): void {
    this.router.navigate(['/category', c.slug]);
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
