import { join } from "node:path";
import { BrowserWindow, app, ipcMain, session, shell } from "electron";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import {
  IpcChannel,
  emptyIpcPayloadSchema,
  windowIsMaximizedResultSchema,
} from "@ai-hub/shared";

function applyContentSecurityPolicy(): void {
  const developmentCsp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self' ws://localhost:* http://localhost:*",
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
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  const policy = is.dev ? developmentCsp : productionCsp;

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [policy],
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
    const local =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && local;
  }
  return parsed.protocol === "file:";
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

function registerWindowIpc(): void {
  const parseEmpty = (payload: unknown): void => {
    emptyIpcPayloadSchema.parse(payload ?? {});
  };

  ipcMain.handle(IpcChannel.windowMinimize, (event, payload: unknown) => {
    parseEmpty(payload);
    targetWindow(event)?.minimize();
  });

  ipcMain.handle(IpcChannel.windowMaximize, (event, payload: unknown) => {
    parseEmpty(payload);
    const window = targetWindow(event);
    if (!window) {
      return;
    }
    if (window.isMaximized()) {
      window.unmaximize();
      return;
    }
    window.maximize();
  });

  ipcMain.handle(IpcChannel.windowClose, (event, payload: unknown) => {
    parseEmpty(payload);
    targetWindow(event)?.close();
  });

  ipcMain.handle(IpcChannel.windowIsMaximized, (event, payload: unknown) => {
    parseEmpty(payload);
    return windowIsMaximizedResultSchema.parse(targetWindow(event)?.isMaximized() ?? false);
  });
}

function createWindow(): void {
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
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  attachNavigationLocks(window);

  window.on("ready-to-show", () => {
    window.show();
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    void window.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.aihub.desktop");
  applyContentSecurityPolicy();
  registerWindowIpc();

  app.on("browser-window-created", (_event, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
