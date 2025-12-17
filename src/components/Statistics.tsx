import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { format } from 'date-fns';
import { invoke } from '@tauri-apps/api/core';
import { Trash2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from '@/components/ui/card';
import '../styles/calendar.css';

interface DailyStats {
    date: string;
    totalUsageSeconds: number;

    // Microbreaks
    microPrompts: number;
    microRepeatedPrompts: number;
    microPromptedTaken: number;
    microNaturalTaken: number;
    microSkipped: number;
    microPostponed: number;

    // Rest Breaks
    restPrompts: number;
    restRepeatedPrompts: number;
    restPromptedTaken: number;
    restNaturalTaken: number;
    restSkipped: number;
    restPostponed: number;

    // Daily Limit
    dailyPrompts: number;
    dailyRepeatedPrompts: number;
    dailyPromptedTaken: number;
    dailyNaturalTaken: number;
    dailySkipped: number;
    dailyPostponed: number;

    overdueSeconds: number;
}

const EmptyStats: DailyStats = {
    date: "",
    totalUsageSeconds: 0,
    microPrompts: 0, microRepeatedPrompts: 0, microPromptedTaken: 0, microNaturalTaken: 0, microSkipped: 0, microPostponed: 0,
    restPrompts: 0, restRepeatedPrompts: 0, restPromptedTaken: 0, restNaturalTaken: 0, restSkipped: 0, restPostponed: 0,
    dailyPrompts: 0, dailyRepeatedPrompts: 0, dailyPromptedTaken: 0, dailyNaturalTaken: 0, dailySkipped: 0, dailyPostponed: 0,
    overdueSeconds: 0
};

export const Statistics: React.FC = () => {
    const [date, setDate] = useState<Date>(new Date());
    const [stats, setStats] = useState<DailyStats>(EmptyStats);

    useEffect(() => {
        loadStats(date);
    }, [date]);

    // Format utility for "H:MM:SS" or "MM:SS"
    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        // const s = seconds % 60; // Usually stats are MM:SS unless huge
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    const loadStats = async (selectedDate: Date) => {
        try {
            // In a real app we might fetch range and filter, or fetch specific day
            // Here we assume get_statistics returns N days and we find ours, or we add a get_day_stats command
            // For MVP: fetching last 365 days and finding the matching one is "fine" for local data
            const allStats: DailyStats[] = await invoke('get_statistics', { days: 365 });
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const dayStat = allStats.find(s => s.date === dateStr) || { ...EmptyStats, date: dateStr };
            setStats(dayStat);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const handleDeleteHistory = async () => {
        // TODO: Implement delete command
        console.warn("Delete history not implemented yet");
    };

    return (
        <div className="flex flex-row h-[500px] w-full gap-4 p-4 bg-background text-foreground select-none">
            {/* Left Panel: Browse History */}
            <div className="w-[320px] flex flex-col gap-4">
                <h2 className="text-lg font-semibold">Browse history</h2>

                <div className="bg-card rounded-md border shadow-sm p-2">
                    <Calendar
                        onChange={(d) => setDate(d as Date)}
                        value={date}
                        className="w-full text-sm border-0"
                    />
                </div>

                <Button
                    variant="secondary"
                    className="mt-auto w-full flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10"
                    onClick={handleDeleteHistory}
                >
                    <Trash2 className="w-4 h-4" />
                    Delete all statistics history
                </Button>
            </div>

            {/* Right Panel: Statistics */}
            <div className="flex-1 flex flex-col gap-4">
                <h2 className="text-lg font-semibold">Statistics</h2>
                <div className="text-sm text-muted-foreground mb-2">
                    Date: {format(date, 'MM/dd/yyyy')}
                </div>

                <Tabs defaultValue="breaks" className="w-full h-full flex flex-col">
                    <TabsList className="w-fit mb-2">
                        <TabsTrigger value="breaks">Breaks</TabsTrigger>
                        <TabsTrigger value="activity">Activity</TabsTrigger>
                    </TabsList>

                    <TabsContent value="breaks" className="flex-1">
                        <Card className="h-full overflow-hidden border rounded-md">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                                    <tr>
                                        <th className="p-3 font-normal w-1/3"></th>
                                        <th className="p-3 font-normal text-center">✋ Micro-break</th>
                                        <th className="p-3 font-normal text-center">☕ Rest break</th>
                                        <th className="p-3 font-normal text-center">📊 Daily limit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    <tr>
                                        <td className="p-3">Break prompts</td>
                                        <td className="p-3 text-center">{stats.microPrompts}</td>
                                        <td className="p-3 text-center">{stats.restPrompts}</td>
                                        <td className="p-3 text-center">{stats.dailyPrompts}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3">Repeated prompts</td>
                                        <td className="p-3 text-center">{stats.microRepeatedPrompts}</td>
                                        <td className="p-3 text-center">{stats.restRepeatedPrompts}</td>
                                        <td className="p-3 text-center">{stats.dailyRepeatedPrompts}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3">Prompted breaks taken</td>
                                        <td className="p-3 text-center">{stats.microPromptedTaken}</td>
                                        <td className="p-3 text-center">{stats.restPromptedTaken}</td>
                                        <td className="p-3 text-center">{stats.dailyPromptedTaken}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3">Natural breaks taken</td>
                                        <td className="p-3 text-center">{stats.microNaturalTaken}</td>
                                        <td className="p-3 text-center">{stats.restNaturalTaken}</td>
                                        <td className="p-3 text-center">{stats.dailyNaturalTaken}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3">Breaks skipped</td>
                                        <td className="p-3 text-center">{stats.microSkipped}</td>
                                        <td className="p-3 text-center">{stats.restSkipped}</td>
                                        <td className="p-3 text-center">{stats.dailySkipped}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3">Breaks postponed</td>
                                        <td className="p-3 text-center">{stats.microPostponed}</td>
                                        <td className="p-3 text-center">{stats.restPostponed}</td>
                                        <td className="p-3 text-center">{stats.dailyPostponed}</td>
                                    </tr>
                                    <tr className="bg-muted/10">
                                        <td className="p-3 font-medium">Overdue time</td>
                                        <td className="p-3 text-center text-destructive font-medium" colSpan={3}>
                                            {formatDuration(stats.overdueSeconds)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className="mt-auto border-t">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-muted-foreground border-b text-xs uppercase">
                                            <th className="p-2 w-1/3"></th>
                                            <th className="p-2 text-center">Daily</th>
                                            <th className="p-2 text-center">Weekly</th>
                                            <th className="p-2 text-center">Monthly</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="p-3 font-medium">Usage</td>
                                            <td className="p-3 text-center">{formatDuration(stats.totalUsageSeconds)}</td>
                                            <td className="p-3 text-center">-</td>
                                            <td className="p-3 text-center">-</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>

                    <TabsContent value="activity">
                        <div className="flex items-center justify-center h-full text-muted-foreground border rounded-md bg-muted/10">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Activity timeline coming soon
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};
