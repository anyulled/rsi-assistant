import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DailyStats {
    date: string;
    totalUsageSeconds: number;
    microbreaksTaken: number;
    microbreaksPostponed: number;
    restBreaksTaken: number;
    restBreaksPostponed: number;
}

const COLORS = ['#10b981', '#ef4444'];

export function Statistics() {
    const [stats, setStats] = useState<DailyStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(7);

    useEffect(() => {
        loadStatistics();
    }, [days]);

    const loadStatistics = async () => {
        try {
            setLoading(true);
            const data = await invoke<DailyStats[]>('get_statistics', { days });
            setStats(data);
        } catch (error) {
            console.error('Failed to load statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-4">Loading statistics...</div>;
    }

    // Prepare data for charts
    const usageData = stats.map(s => ({
        date: s.date,
        hours: (s.totalUsageSeconds / 3600).toFixed(1),
    }));

    const totalMicroTaken = stats.reduce((sum, s) => sum + s.microbreaksTaken, 0);
    const totalMicroPostponed = stats.reduce((sum, s) => sum + s.microbreaksPostponed, 0);
    const totalRestTaken = stats.reduce((sum, s) => sum + s.restBreaksTaken, 0);
    const totalRestPostponed = stats.reduce((sum, s) => sum + s.restBreaksPostponed, 0);

    const complianceData = [
        { name: 'Taken', value: totalMicroTaken + totalRestTaken },
        { name: 'Postponed', value: totalMicroPostponed + totalRestPostponed },
    ];

    const todayStats = stats[0] || {
        totalUsageSeconds: 0,
        microbreaksTaken: 0,
        microbreaksPostponed: 0,
        restBreaksTaken: 0,
        restBreaksPostponed: 0,
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Statistics</h2>
                <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="px-3 py-2 border rounded-md"
                >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                </select>
            </div>

            {/* Today's Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Today's Usage</div>
                    <div className="text-2xl font-bold">{(todayStats.totalUsageSeconds / 3600).toFixed(1)}h</div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Microbreaks Taken</div>
                    <div className="text-2xl font-bold">{todayStats.microbreaksTaken}</div>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Rest Breaks Taken</div>
                    <div className="text-2xl font-bold">{todayStats.restBreaksTaken}</div>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Breaks Postponed</div>
                    <div className="text-2xl font-bold">{todayStats.microbreaksPostponed + todayStats.restBreaksPostponed}</div>
                </div>
            </div>

            {/* Daily Usage Chart */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Daily Usage (Hours)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={usageData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="hours" fill="#3b82f6" name="Hours" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Break Compliance Chart */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Break Compliance</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={complianceData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {complianceData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
