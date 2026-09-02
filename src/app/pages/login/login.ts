import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="wrap">
      <form class="card box" (ngSubmit)="submit()">
        <h1>GEN Z <span>ADMIN</span></h1>
        <p class="muted sub">Menu &amp; image management</p>

        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" name="email" [(ngModel)]="email" autocomplete="username" />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" type="password" name="password" [(ngModel)]="password" autocomplete="current-password" />
        </div>

        @if (error()) {
          <p class="err">{{ error() }}</p>
        }

        <button class="btn btn-primary full" type="submit" [disabled]="loading()">
          {{ loading() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  `,
  styles: [
    `
      .wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 20px;
      }
      .box {
        width: 100%;
        max-width: 360px;
        padding: 30px 26px;
      }
      h1 {
        font-size: 30px;
      }
      h1 span {
        color: var(--red);
      }
      .sub {
        margin: 4px 0 22px;
        font-size: 13px;
      }
      .full {
        width: 100%;
        justify-content: center;
        margin-top: 6px;
      }
      .err {
        color: #ff6b73;
        font-size: 13px;
        margin: 0 0 12px;
      }
    `,
  ],
})
export class LoginComponent {
  email = 'admin@genzfoods.pk';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  submit(): void {
    this.error.set(null);
    this.loading.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/categories']),
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Login failed. Check your credentials.');
        this.loading.set(false);
      },
    });
  }
}
