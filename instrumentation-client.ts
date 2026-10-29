// This file configures the initialization of Sentry on the client.   
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://43f5cae6ac188b335a8efa1742e3ef3a@o4510290447171584.ingest.de.sentry.io/4510290452021328",

  // No session replay: it records the screen of our users, who are children,
  // and adds a large script to every page. Error reports are enough.

  // Trace 10% of page loads and navigations
  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Our users are children: never send IP addresses, cookies or other
  // personal data with error reports (see the privacy policy)
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;