import { join } from "node:path";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { BrowserWindow, Menu, Tray, app, clipboard, dialog, globalShortcut, nativeImage, protocol, session, shell } from "electron";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { ARTIFACT_PROTOCOL } from "@ai-hub/shared";
import { redactSecrets, safeErrorMessage } from "@ai-hub/security";
import { registerWindowIpc, registerWorkspaceIpc } from "./ipc";
import { ARTIFACT_HTML_CSP, registerArtifactProtocol } from "./artifacts";
import { applyCrashReporterOptIn } from "./crash-reporter";
import { bootPersistence, getHubDatabase } from "./persistence";
import { isE2eMode } from "./e2e-mode";
import { checkForAppUpdates } from "./updater";

protocol.registerSchemesAsPrivileged([
  {
    scheme: ARTIFACT_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: false,
      corsEnabled: false,
      stream: true,
    },
  },
]);

if (isE2eMode()) {
  app.setPath("userData", mkdtempSync(join(tmpdir(), "ai-hub-e2e-")));
}

function applyContentSecurityPolicy(): void {
  const developmentCsp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self' ws://localhost:* http://localhost:*",
    "frame-src 'self' ai-hub-artifact:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  const productionCsp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src 'self' ai-hub-artifact:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  const policy = is.dev ? developmentCsp : productionCsp;

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (details.resourceType === "subFrame" && !isAllowedArtifactFrame(details.url)) {
      callback({ cancel: true });
      return;
    }
    callback({});
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const artifactPreview = details.url.startsWith(`${ARTIFACT_PROTOCOL}:`);
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [artifactPreview ? ARTIFACT_HTML_CSP : policy],
      },
    });
  });
}

function isAllowedAppNavigation(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (is.dev) {
    const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && local;
  }
  return parsed.protocol === "file:";
}

function isAllowedArtifactFrame(url: string): boolean {
  if (url === "about:blank" || url === "about:srcdoc") {
    return true;
  }
  try {
    return new URL(url).protocol === `${ARTIFACT_PROTOCOL}:`;
  } catch {
    return false;
  }
}

function isAllowedExternalOpen(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function attachNavigationLocks(window: BrowserWindow): void {
  window.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedAppNavigation(url)) {
      event.preventDefault();
    }
  });

  window.webContents.on("will-redirect", (event, url) => {
    if (!isAllowedAppNavigation(url)) {
      event.preventDefault();
    }
  });

  window.webContents.on("will-frame-navigate", (event) => {
    const url = event.url;
    if (event.isMainFrame) {
      if (!isAllowedAppNavigation(url)) {
        event.preventDefault();
      }
      return;
    }
    if (!isAllowedArtifactFrame(url)) {
      event.preventDefault();
    }
  });

  window.webContents.setWindowOpenHandler((details) => {
    if (isAllowedExternalOpen(details.url)) {
      void shell.openExternal(details.url);
    }
    return { action: "deny" };
  });
}

function targetWindow(event: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender);
}

function preloadScript(): string {
  const cjs = join(__dirname, "../preload/index.cjs");
  const mjs = join(__dirname, "../preload/index.mjs");
  const js = join(__dirname, "../preload/index.js");
  if (existsSync(cjs)) {
    return cjs;
  }
  if (existsSync(mjs)) {
    return mjs;
  }
  return js;
}

let mainWindow: BrowserWindow | null = null;
let quickAiWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function loadRenderer(window: BrowserWindow, quickAi = false): void {
  const hash = quickAi ? "quick-ai" : undefined;
  if ((is.dev && !isE2eMode()) && process.env["ELECTRON_RENDERER_URL"]) {
    void window.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}${hash ? `#${hash}` : ""}`);
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"), hash ? { hash } : undefined);
  }
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#0c0c0e",
    webPreferences: {
      preload: preloadScript(),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  attachNavigationLocks(window);

  window.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error("[hub:preload]", preloadPath, safeErrorMessage(error));
  });

  window.on("ready-to-show", () => {
    window.show();
  });
  window.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      window.hide();
    }
  });
  window.on("closed", () => { if (mainWindow === window) mainWindow = null; });
  loadRenderer(window);
  return window;
}

function showQuickAi(prefill = ""): void {
  const safePrefill = redactSecrets(prefill).slice(0, 100_000);
  if (!quickAiWindow || quickAiWindow.isDestroyed()) {
    quickAiWindow = new BrowserWindow({
      width: 680, height: 460, minWidth: 560, minHeight: 360, show: false, frame: false,
      alwaysOnTop: true, skipTaskbar: true, resizable: true, backgroundColor: "#0c0c0e",
      webPreferences: { preload: preloadScript(), sandbox: true, contextIsolation: true, nodeIntegration: false, spellcheck: false },
    });
    attachNavigationLocks(quickAiWindow);
    attachQuickAiContext(quickAiWindow);
    quickAiWindow.on("blur", () => quickAiWindow?.hide());
    quickAiWindow.on("closed", () => { quickAiWindow = null; });
    loadRenderer(quickAiWindow, true);
    quickAiWindow.webContents.once("did-finish-load", () => {
      if (safePrefill) quickAiWindow?.webContents.send("quickAi:prefill", safePrefill);
    });
  } else if (safePrefill) {
    quickAiWindow.webContents.send("quickAi:prefill", safePrefill);
  }
  quickAiWindow.show();
  quickAiWindow.focus();
}

function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) mainWindow = createWindow();
  mainWindow.show();
  mainWindow.focus();
}

function attachQuickAiContext(window: BrowserWindow): void {
  window.webContents.on("context-menu", (_event, params) => {
    const selection = params.selectionText.trim();
    if (!selection) return;
    Menu.buildFromTemplate([{ label: "Perguntar à IA / Ask AI", click: () => showQuickAi(selection) }]).popup({ window });
  });
}

function createTray(): void {
  const icon = nativeImage.createFromPath(join(__dirname, "../../resources/icon.png"));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip("AI Hub Desktop");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Mostrar AI Hub / Show AI Hub", click: showMainWindow },
    { label: "Quick AI", click: () => showQuickAi() },
    { type: "separator" },
    { label: "Sair / Quit", click: () => { isQuitting = true; app.quit(); } },
  ]));
  tray.on("double-click", showMainWindow);
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.aihub.desktop");
  applyContentSecurityPolicy();
  registerWindowIpc(targetWindow, (event) => BrowserWindow.fromWebContents(event.sender) === quickAiWindow);
  try {
    await bootPersistence();
  } catch (error) {
    dialog.showErrorBox("AI Hub", safeErrorMessage(error));
    app.quit();
    return;
  }
  registerArtifactProtocol();
  registerWorkspaceIpc();
  applyCrashReporterOptIn(getHubDatabase().repos.getAppPrefs().crashReporterOptIn);
  void checkForAppUpdates()
    .then((result) => {
      getHubDatabase().repos.setAppPrefs({
        lastUpdateCheckAt: new Date().toISOString(),
        lastUpdateStatus: result.status,
      });
    })
    .catch(() => {
      // Feed down or unpackaged: never block boot.
    });

  app.on("browser-window-created", (_event, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  mainWindow = createWindow();
  attachQuickAiContext(mainWindow);
  createTray();
  const quickShortcutRegistered = globalShortcut.register("CommandOrControl+Shift+Space", () =>
    showQuickAi(clipboard.readText()),
  );
  if (!quickShortcutRegistered) console.warn("[hub:quick-ai] global shortcut unavailable");

  app.on("activate", () => {
    showMainWindow();
  });
});

app.on("window-all-closed", () => {
  // Tray keeps the application available in the background on every platform.
});

app.on("before-quit", () => { isQuitting = true; globalShortcut.unregisterAll(); tray?.destroy(); tray = null; });
