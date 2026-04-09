import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';

type TranslationValue = string | number | boolean | TranslationMap | TranslationValue[];
interface TranslationMap {
  [key: string]: TranslationValue;
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  private static readonly DEFAULT_LANGUAGE = 'en';
  private static readonly LANGUAGE_STORAGE_KEY = 'appLanguage';

  private http = inject(HttpClient);
  private title = inject(Title);

  private translations: TranslationMap = {};
  private activeLanguage = I18nService.DEFAULT_LANGUAGE;
  private translationCache: Record<string, TranslationMap> = {};
  private readonly requestVersion = Date.now().toString();

  // Load the saved language or default on service initialization
  async initialize(): Promise<void> {
    const savedLanguage = localStorage.getItem(I18nService.LANGUAGE_STORAGE_KEY);
    await this.setLanguage(savedLanguage || I18nService.DEFAULT_LANGUAGE);
  }

  // Change the active language and load corresponding translations
  async setLanguage(language: string): Promise<void> {
    const normalizedLanguage = this.normalizeLanguageCode(language);
    this.activeLanguage = normalizedLanguage;

    try {
      const data = await this.loadTranslations(normalizedLanguage);

      this.translations = data;
      localStorage.setItem(I18nService.LANGUAGE_STORAGE_KEY, normalizedLanguage);
      this.syncDocumentTitle();
    } catch (error) {
      console.error(`Failed to load translations for language: ${normalizedLanguage}`, error);

      if (normalizedLanguage !== I18nService.DEFAULT_LANGUAGE) {
        await this.setLanguage(I18nService.DEFAULT_LANGUAGE);
      }
    }
  }

  getLanguage(): string {
    return this.activeLanguage;
  }

  async preloadLanguages(languages: string[]): Promise<void> {
    const uniqueLanguages = Array.from(
      new Set(languages.filter(Boolean).map((language) => this.normalizeLanguageCode(language)))
    );

    await Promise.all(
      uniqueLanguages.map(async (language) => {
        try {
          await this.loadTranslations(language);
        } catch {
          // Intentionally ignore preload errors; setLanguage handles fallback.
        }
      })
    );
  }

  t(key: string, params?: Record<string, string | number>, fallback?: string): string {
    const value = this.resolveKey(key);

    if (typeof value !== 'string') {
      return fallback || key;
    }

    return this.interpolate(value, params);
  }

  tArray(key: string): string[] {
    const value = this.resolveKey(key);
    if (!Array.isArray(value)) return [];

    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  private resolveKey(key: string): TranslationValue | undefined {
    return key.split('.').reduce<TranslationValue | undefined>((current, segment) => {
      if (!current || typeof current !== 'object' || Array.isArray(current)) {
        return undefined;
      }

      return (current as TranslationMap)[segment];
    }, this.translations);
  }

  private normalizeLanguageCode(language: string | null | undefined): string {
    const normalizedInput = (language || '').trim().toLowerCase();
    if (!normalizedInput) return I18nService.DEFAULT_LANGUAGE;

    // Keep only canonical language codes in app state/storage.
    if (normalizedInput.startsWith('el') || normalizedInput === 'gr') return 'el';
    if (normalizedInput.startsWith('en')) return 'en';
    if (normalizedInput.startsWith('ro')) return 'ro';
    if (normalizedInput.startsWith('sr')) return 'sr';
    if (normalizedInput.startsWith('bg')) return 'bg';
    if (normalizedInput.startsWith('tr')) return 'tr';
    return I18nService.DEFAULT_LANGUAGE;
  }

  private async loadTranslations(language: string): Promise<TranslationMap> {
    const cachedTranslations = this.translationCache[language];
    if (cachedTranslations) {
      return cachedTranslations;
    }

    const data = await firstValueFrom(
      this.http.get<TranslationMap>(`/i18n/${language}.json?v=${this.requestVersion}`)
    );

    const normalizedData = data || {};
    this.translationCache[language] = normalizedData;
    return normalizedData;
  }

  private interpolate(template: string, params?: Record<string, string | number>): string {
    if (!params) return template;

    return template.replace(/{{\s*(\w+)\s*}}/g, (_match, key) => {
      const replacement = params[key];
      return replacement !== undefined ? String(replacement) : '';
    });
  }

  private syncDocumentTitle(): void {
    const translatedTitle = this.t('meta.title', undefined, 'Blue Quartz Apartment');
    this.title.setTitle(translatedTitle);
  }
}
