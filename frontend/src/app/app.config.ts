import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { I18nService } from './service/i18n';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ 
      anchorScrolling: 'enabled', 
      scrollPositionRestoration: 'enabled' 
    })),
    provideHttpClient(),
    provideAppInitializer(() => inject(I18nService).initialize())
  ]
};
