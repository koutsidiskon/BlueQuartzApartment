import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../service/i18n';

@Pipe({
  name: 't',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(key: string | null | undefined, params?: Record<string, string | number>, fallback?: string): string {
    if (!key) return '';
    return this.i18n.t(key, params, fallback);
  }
}
