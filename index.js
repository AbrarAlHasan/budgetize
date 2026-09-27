import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "https://60311b20b7888ddc2048ae7881323d91@o4505251515465728.ingest.us.sentry.io/4510549092401152",
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
});

import "expo-router/entry";
