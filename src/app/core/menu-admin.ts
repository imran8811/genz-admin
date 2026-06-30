import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Category, MenuItem } from './models';

/** CRUD against genz-admin-apis for categories, menu items (incl. deals) and images. */
@Injectable({ providedIn: 'root' })
export class MenuAdminService {
  private readonly base = `${environment.apiBaseUrl}/admin`;

  constructor(private http: HttpClient) {}

  // ---- Categories ----
  categories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.base}/categories`);
  }

  createCategory(data: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(`${this.base}/categories`, data);
  }

  updateCategory(slug: string, data: Partial<Category>): Observable<Category> {
    return this.http.put<Category>(`${this.base}/categories/${slug}`, data);
  }

  deleteCategory(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/categories/${slug}`);
  }

  uploadCategoryImage(slug: string, file: File): Observable<Category> {
    return this.http.post<Category>(`${this.base}/categories/${slug}/image`, this.imageForm(file));
  }

  reorderCategories(slugs: string[]): Observable<unknown> {
    return this.http.post(`${this.base}/categories/reorder`, { slugs });
  }

  // ---- Menu items (and deals) ----
  items(categoryId?: number): Observable<MenuItem[]> {
    const q = categoryId ? `?category_id=${categoryId}` : '';
    return this.http.get<MenuItem[]>(`${this.base}/menu-items${q}`);
  }

  createItem(data: Partial<MenuItem>): Observable<MenuItem> {
    return this.http.post<MenuItem>(`${this.base}/menu-items`, data);
  }

  updateItem(slug: string, data: Partial<MenuItem>): Observable<MenuItem> {
    return this.http.put<MenuItem>(`${this.base}/menu-items/${slug}`, data);
  }

  deleteItem(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/menu-items/${slug}`);
  }

  uploadItemImage(slug: string, file: File): Observable<MenuItem> {
    return this.http.post<MenuItem>(`${this.base}/menu-items/${slug}/image`, this.imageForm(file));
  }

  reorderItems(slugs: string[]): Observable<unknown> {
    return this.http.post(`${this.base}/menu-items/reorder`, { slugs });
  }

  /** Public image URL (cache-busted) for previewing the current upload. */
  imageUrl(categorySlug: string, slug: string, updatedAt: string | null): string | null {
    if (!updatedAt) return null;
    const v = Math.floor(new Date(updatedAt).getTime() / 1000);
    const base = environment.apiBaseUrl.replace(/\/api$/, '');
    return `${base}/menu/${categorySlug}/${slug}.webp?v=${v}`;
  }

  private imageForm(file: File): FormData {
    const fd = new FormData();
    fd.append('image', file);
    return fd;
  }
}
