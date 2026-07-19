import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// sockjs-client expects Node's `global` in browser bundles
(globalThis as typeof globalThis & { global: typeof globalThis }).global = globalThis;

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
