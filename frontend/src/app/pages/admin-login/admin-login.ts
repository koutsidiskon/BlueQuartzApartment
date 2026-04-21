import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AdminAuthService } from '../../service/admin-auth';
import { LanguageFacadeService } from '../../service/language-option';
import { I18nService } from '../../service/i18n';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss'
})
export class AdminLogin {
  @ViewChild('emailInput') emailInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') passwordInputRef!: ElementRef<HTMLInputElement>;

  email = '';
  password = '';
  isSubmitting = false;
  error = '';
  currentLanguage = 'en';
  desktopLanguageMenuOpen = false;

  readonly languageOptions;

  constructor(
    private adminAuth: AdminAuthService,
    private router: Router,
    private languageFacade: LanguageFacadeService,
    private i18n: I18nService,
    private cdr: ChangeDetectorRef
  ) {
    this.currentLanguage = this.languageFacade.getCurrentLanguage();
    this.languageOptions = this.languageFacade.languageOptions;

    this.adminAuth.me().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          void this.router.navigate(['/admin/panel']);
        }
      },
      error: () => {
        // No active session: stay on login page.
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.lang-switcher')) {
      this.desktopLanguageMenuOpen = false;
    }
  }

  submitLogin(): void {
    const normalizedEmail = (this.email || this.emailInputRef.nativeElement.value).trim().toLowerCase();
    const normalizedPassword = this.password || this.passwordInputRef.nativeElement.value;

    if (!normalizedEmail || !normalizedPassword) {
      this.error = this.i18n.t('adminLogin.errors.required', undefined, 'Please provide email and password.');
      this.cdr.detectChanges();
      return;
    }

    this.isSubmitting = true;
    this.error = '';

    this.adminAuth.login(normalizedEmail, normalizedPassword).pipe(
      finalize(() => {
        this.isSubmitting = false;
      })
    ).subscribe({
      next: (response) => {
        if (!response.success) {
          this.error = this.resolveLoginError(response.message);
          this.cdr.detectChanges();
          return;
        }

        this.error = '';
        this.password = '';
        void this.router.navigate(['/admin/panel']);
      },
      error: (err) => {
        this.error = this.resolveLoginError(err?.error?.message);
        this.cdr.detectChanges();
      }
    });
  }

  private resolveLoginError(rawMessage: string | null | undefined): string {
    const normalized = String(rawMessage || '').trim().toLowerCase();
    if (normalized.includes('invalid credentials')) {
      return this.i18n.t('adminLogin.errors.invalidCredentials', undefined, 'Invalid credentials.');
    }

    if (normalized) {
      return rawMessage as string;
    }

    return this.i18n.t('adminLogin.errors.loginFailed', undefined, 'Login failed.');
  }

  toggleDesktopLanguageMenu(event: Event): void {
    event.stopPropagation();
    this.desktopLanguageMenuOpen = !this.desktopLanguageMenuOpen;
  }

  async selectDesktopLanguage(languageCode: string, event?: Event): Promise<void> {
    event?.stopPropagation();
    this.currentLanguage = await this.languageFacade.setLanguage(languageCode);
    this.desktopLanguageMenuOpen = false;
  }

  getLanguageFlag(languageCode: string): string {
    return this.languageFacade.getFlag(languageCode);
  }
}
