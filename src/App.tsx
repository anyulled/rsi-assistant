import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTimer } from "./hooks/useTimer";
import { TimerDisplay } from "./components/TimerDisplay";
import { Settings } from "./pages/Settings";
import { BreakOverlay } from "./pages/BreakOverlay";
import { Exercises } from "./pages/Exercises";
import { Statistics } from "./components/Statistics";
import "./App.css";

function App() {
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
    let unlisten: () => void;

    async function setupListener() {
      unlisten = await listen<string>("navigate-to", (event) => {
        const targetView = event.payload as "timer" | "settings" | "exercises" | "statistics";
        setView(targetView);
      });
    }

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  if (isOverlay) {
    return <BreakOverlay />;
  }

  return (
    <main className="container h-screen mx-auto p-4 select-none">
      {/* App Header */}
      <div className="flex items-center gap-3 mb-6">
        <img
          src="/icons/128x128.png"
          alt="RSI Assistant"
          className="w-12 h-12"
          onError={(e) => {
            // Fallback if icon not found
            e.currentTarget.style.display = "none";
          }}
        />
        <h1 className="text-2xl font-bold text-foreground">RSI Recovery Assistant</h1>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="timer">Timer</TabsTrigger>
          <TabsTrigger value="exercises">Exercises</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="timer">
          {/* Conditional rendering to prevent null check errors during init */}
          {timerStatus ? (
            <TimerDisplay status={timerStatus} />
          ) : (
            <div className="flex items-center justify-center h-64">
              <span className="text-muted-foreground">Loading timer...</span>
            </div>
          )}
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
