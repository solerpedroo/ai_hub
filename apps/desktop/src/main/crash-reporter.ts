import { app, crashReporter } from "electron";

let started = false;

export function applyCrashReporterOptIn(optIn: boolean): void {
  if (!optIn || started) {
    return;
  }
  crashReporter.start({
    productName: "AI Hub",
    companyName: "AI Hub",
    submitURL: "https://127.0.0.1/crash-disabled",
    uploadToServer: false,
    compress: true,
    extra: {
      version: app.getVersion(),
      platform: process.platform,
    },
  });
  started = true;
}
