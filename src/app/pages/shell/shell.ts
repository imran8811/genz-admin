import { Component } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet],
  template: `
    <header class="topbar">
      <div class="brand">GEN Z <span>ADMIN</span></div>
      <div class="right">
        <span class="who muted">{{ auth.user()?.email }}</span>
        <button class="btn btn-ghost" (click)="logout()">Log out</button>
      </div>
    </header>
    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: [
    `
      .topbar {
        position: sticky;
        top: 0;
        z-index: 5;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 32px;
        background: var(--surface);
        border-bottom: 1px solid var(--border);
      }
      .brand {
        font-family: 'Roboto', sans-serif;
        font-weight: 900;
        font-size: 22px;
        letter-spacing: 0.5px;
      }
      .brand span {
        color: var(--red);
      }
      .right {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .who {
        font-size: 12px;
      }
      .content {
        padding: 28px 32px;
        max-width: 1100px;
        margin: 0 auto;
      }
    `,
  ],
})
export class ShellComponent {
  constructor(
    public auth: AuthService,
    private router: Router,
  ) {}

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
