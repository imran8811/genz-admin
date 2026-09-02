import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AdminUser } from './models';

const TOKEN_KEY = 'genz_admin_token';
const USER_KEY = 'genz_admin_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = environment.apiBaseUrl;

  readonly user = signal<AdminUser | null>(this.readUser());
  readonly isAuthenticated = computed(() => this.user() !== null && this.token() !== null);

  constructor(private http: HttpClient) {}

  token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  login(email: string, password: string): Observable<{ token: string; user: AdminUser }> {
    return this.http
      .post<{ token: string; user: AdminUser }>(`${this.base}/auth/login`, { email, password })
      .pipe(
        tap(({ token, user }) => {
          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          this.user.set(user);
        }),
      );
  }

  logout(): void {
    this.http.post(`${this.base}/admin/auth/logout`, {}).subscribe({ complete: () => {}, error: () => {} });
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
  }

  private readUser(): AdminUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  }
}
