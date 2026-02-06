import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import "./App.css";
import { Statistics } from "./components/Statistics";
import { TimerDisplay } from "./components/TimerDisplay";
import { useSettingsSync } from "./hooks/useSettingsSync";
import { useTimer } from "./hooks/useTimer";
import { BreakOverlay } from "./pages/BreakOverlay";
import { Exercises } from "./pages/Exercises";
import { Settings } from "./pages/Settings";

function App() {
  useSettingsSync();
  const timerStatus = useTimer();
  const [view, setView] = useState<"timer" | "settings" | "exercises" | "statistics">("timer");
  const [isOverlay, setIsOverlay] = useState(false);

  useEffect(() => {
    // Check if we are in the overlay window
    try {
      if (getCurrentWindow().label === "overlay") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsOverlay(true);
      }
    } catch {
      console.log("Not running in Tauri window or failed to get label");
    }

    // Listen for system tray navigation events
    const unlistenPromise = listen<string>("navigate-to", (event) => {
      const targetView = event.payload as "timer" | "settings" | "exercises" | "statistics";
      setView(targetView);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten()).catch(() => {});
    };
  }, []);

  if (isOverlay) {
    return <BreakOverlay />;
  }

  return (
    <main className="container max-h-screen overflow-hidden mx-auto p-4 select-none flex flex-col bg-background dark:bg-gray-900">
      {/* App Header */}
      <div className="flex items-center gap-3 mb-6">
        <img
          src="/public/banner.jpeg"
          alt="RSI Assistant"
          className="w-12 h-12"
          onError={(e) => {
            // Fallback if icon not found
            e.currentTarget.style.display = "none";
          }}
        />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">RSI Recovery Assistant</h1>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="timer">Timer</TabsTrigger>
          <TabsTrigger value="exercises">Exercises</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="timer">
          <TimerDisplay status={timerStatus} />
        </TabsContent>

        <TabsContent value="exercises">
          <Exercises />
        </TabsContent>

        <TabsContent value="statistics">
          <Statistics />
        </TabsContent>

        <TabsContent value="settings">
          {/* SettingsView would go here when implemented */}
          <Settings />
        </TabsContent>
      </Tabs>
    </main>
  );
}

export default App;
