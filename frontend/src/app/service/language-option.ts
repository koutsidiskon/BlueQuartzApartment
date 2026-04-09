import { Injectable, inject } from '@angular/core';
import { I18nService } from './i18n';

export interface LanguageOption {
  code: string;
  flag: string;
}

@Injectable({ providedIn: 'root' })
export class LanguageFacadeService {
  readonly languageOptions: LanguageOption[] = [
    { code: 'en', flag: '🇬🇧' },
    { code: 'el', flag: '🇬🇷' },
    { code: 'ro', flag: '🇷🇴' },
    { code: 'sr', flag: '🇷🇸' },
    { code: 'bg', flag: '🇧🇬' },
    { code: 'tr', flag: '🇹🇷' }
  ];

  private i18n = inject(I18nService);

  getCurrentLanguage(): string {
    return this.i18n.getLanguage();
  }

  async preloadAllLanguages(): Promise<void> {
    await this.i18n.preloadLanguages(this.languageOptions.map((language) => language.code));
  }

  async setLanguage(language: string): Promise<string> {
    await this.i18n.setLanguage(language);
    return this.i18n.getLanguage();
  }

  getFlag(languageCode: string): string {
    return this.languageOptions.find((language) => language.code === languageCode)?.flag || '🇬🇧';
  }
}
