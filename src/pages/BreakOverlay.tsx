import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { useTimer } from '@/hooks/useTimer';

export function BreakOverlay() {
    const status = useTimer();
    const [message, setMessage] = useState("Time for a break!");
    const [breakDuration, setBreakDuration] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [breakType, setBreakType] = useState<'micro' | 'rest' | null>(null);
    const submittedRef = useRef(false);

    useEffect(() => {
        if (status) {
            if (status.micro_is_overdue) {
                setMessage("Microbreak Time!");
                setBreakType('micro');
                // Only set duration if not already set (to avoid resetting on every tick)
                setBreakDuration(prev => prev === 0 ? 20 : prev);
            } else if (status.rest_is_overdue) {
                setMessage("Rest Break Time!");
                setBreakType('rest');
                setBreakDuration(prev => prev === 0 ? 300 : prev);
            } else {
                // Reset state when no break is required
                // This ensures the overlay is ready for the next break
                setBreakDuration(0);
                setElapsedTime(0);
                setBreakType(null);
                submittedRef.current = false;
            }
        }
    }, [status]);

    // Track elapsed time during break
    useEffect(() => {
        // Don't start timer if duration is invalid
        if (breakDuration <= 0) return;

        const interval = setInterval(() => {
            setElapsedTime(prev => {
                const next = prev + 1;

                // Auto-complete break when duration is reached
                if (next >= breakDuration) {
                    // We need to call the function but we can't easily access
                    // the latest 'breakType' state here inside the closure without ref or dependency.
                    // But 'breakType' shouldn't change during a break.

                    // Trigger completion
                    // completeBreak(); // This is now handled by a separate useEffect
                    return next; // Or stay at max
                }

                return next;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [breakDuration]);

    // Helper to close window reliably
    const closeWindow = async () => {
        try {
            await getCurrentWindow().hide();
        } catch (e) {
            console.error("Failed to hide window:", e);
        }
    };

    const handleBreakComplete = async () => {
        if (!breakType || submittedRef.current) return;

        submittedRef.current = true;
        try {
            await invoke('record_break_taken', { breakType });
            await invoke('reset_break', { breakType });
        } catch (error) {
            console.error('Failed to record break completion:', error);
            submittedRef.current = false; // Retry on failure?
        }
        await closeWindow();
    };

    const handleSkip = async () => {
        if (!breakType) {
            // If we don't know the type, try to guess or just hide
            await closeWindow();
            return;
        }

        try {
            await invoke('record_break_postponed', { breakType });
            await invoke('reset_break', { breakType });
        } catch (error) {
            console.error('Failed to record postponed break:', error);
        }
        await closeWindow();
    };

    // We need to bridge the interval to the handler
    useEffect(() => {
        if (breakDuration > 0 && elapsedTime >= breakDuration) {
            handleBreakComplete();
        }
    }, [elapsedTime, breakDuration, breakType]); // Added handleBreakComplete to dependencies

    const progress = breakDuration > 0 ? (elapsedTime / breakDuration) * 100 : 0;
    const remainingSeconds = Math.max(0, breakDuration - elapsedTime);
    const remainingMinutes = Math.floor(remainingSeconds / 60);
    const remainingSecondsDisplay = remainingSeconds % 60;

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-black/80 text-white select-none">
            <h1 className="text-4xl font-bold mb-4">{message}</h1>
            <p className="text-lg mb-8">Take a moment to stretch and look away from the screen.</p>

            {/* Break Progress */}
            <div className="mb-8 w-96">
                <div className="flex justify-between mb-2 text-sm">
                    <span>Break Progress</span>
                    <span>{remainingMinutes}:{remainingSecondsDisplay.toString().padStart(2, '0')} remaining</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4">
                    <div
                        className="bg-green-500 h-4 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                    Break will complete automatically
                </p>
            </div>

            <button
                onClick={handleSkip}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
            >
                Skip Break
            </button>
        </div>
    );
}
