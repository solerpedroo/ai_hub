import { useState, type JSX } from "react";
import { TitleBar } from "@/components/layout/title-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { StatusBar } from "@/components/layout/status-bar";
import { HomeView } from "@/components/layout/home-view";
import { SettingsView } from "@/components/layout/settings-view";
import { ChromeCommandPalette } from "@/components/layout/command-palette";
import type { AppView } from "@/components/layout/types";

export function App(): JSX.Element {
  const [view, setView] = useState<AppView>("home");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar view={view} onChange={setView} />
        <main className="min-w-0 flex-1 bg-background">
          {view === "home" ? <HomeView onOpenSettings={() => setView("settings")} /> : <SettingsView />}
        </main>
      </div>
      <StatusBar />
      <ChromeCommandPalette />
    </div>
  );
}
