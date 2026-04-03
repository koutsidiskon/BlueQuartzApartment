import { ApplicationConfig, provideBrowserGlobalErrorListeners , importProvidersFrom} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { LightboxModule } from 'ngx-lightbox';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    importProvidersFrom(LightboxModule),
    provideRouter(routes, withInMemoryScrolling({ 
      anchorScrolling: 'enabled', // Ενεργοποιεί το αυτόματο scroll
      scrollPositionRestoration: 'enabled' // Επαναφέρει το scroll στην κορυφή αν αλλάξεις σελίδα
    })),
    provideHttpClient()
  ]
};
