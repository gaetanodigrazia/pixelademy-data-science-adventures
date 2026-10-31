import { ApplicationConfig, inject, isDevMode, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { provideRouter } from '@angular/router';

import { I18nService } from './core/i18n/i18n.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // La lingua dell'interfaccia (it/en) si sceglie all'avvio: preferenza salvata, altrimenti lingua del browser.
    provideAppInitializer(() => inject(I18nService).detect()),
    // Service Worker (solo in produzione): app e Pyodide in cache, per giocare anche senza connessione stabile.
    provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' }),
  ],
};
