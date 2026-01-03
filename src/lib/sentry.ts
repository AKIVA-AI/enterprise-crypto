/**
 * Sentry Error Tracking Configuration
 * 
 * To enable Sentry:
 * 1. Install: npm install @sentry/react
 * 2. Set VITE_SENTRY_DSN in your .env file
 * 3. Import and call initSentry() in main.tsx
 */

// Placeholder for Sentry initialization
// Uncomment when @sentry/react is installed

/*
import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_ENV || 'development';
  
  if (!dsn) {
    console.log('[Sentry] DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    
    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    // Session replay for debugging
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Filter out known non-issues
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      /Loading chunk \d+ failed/,
    ],
    
    // Add context
    beforeSend(event) {
      // Don't send events in development
      if (environment === 'development') {
        console.log('[Sentry] Would send event:', event);
        return null;
      }
      return event;
    },
  });

  console.log(`[Sentry] Initialized for ${environment}`);
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  console.error('[Error]', error);
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}

export function setUser(userId: string, email?: string) {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.setUser({ id: userId, email });
  }
}
*/

// Stub implementations until Sentry is installed
export function initSentry() {
  console.log('[Sentry] Not configured - install @sentry/react and set VITE_SENTRY_DSN');
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  console.error('[Error]', error, context);
}

export function setUser(userId: string, email?: string) {
  console.log('[Sentry] setUser:', userId, email);
}

