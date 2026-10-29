// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://43f5cae6ac188b335a8efa1742e3ef3a@o4510290447171584.ingest.de.sentry.io/4510290452021328",

  // Trace 10% of requests: enough to spot slow pages, without the overhead
  // of measuring every single request
  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Our users are children: never send IP addresses, cookies or other
  // personal data with error reports (see the privacy policy)
  sendDefaultPii: false,
});
