import './setupTests';
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { render, within, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { useTimer } from '@/hooks/useTimer';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';

import { invoke } from '@tauri-apps/api/core';

// Removed component mocks to avoid conflict with other tests
// We will test App integration with real child components (or mock them efficiently if needed, but integration is better)

import userEvent from '@testing-library/user-event';

// Ensure no global mocks leak
// We mock invoke to control useTimer's data fetching

describe('App', () => {
    beforeEach(() => {
        mock.restore();
        (getCurrentWindow as any).mockImplementation(() => ({
            label: 'main',
            hide: mock(() => Promise.resolve())
        }));
    });

    it('renders Timer view by default', async () => {
        const mockFn = (invoke as any).mockImplementation((cmd: string) => {
            if (cmd === 'get_timer_state') {
                return Promise.resolve({
                    mode: 'Normal',
                    micro_active: 0,
                    micro_target: 100,
                    micro_is_overdue: false,
                    rest_active: 0,
                    rest_target: 1000,
                    rest_is_overdue: false,
                    daily_usage: 0,
                    daily_limit: 10000,
                    current_idle: 0
                });
            }
            if (cmd === 'get_settings') return Promise.resolve({}); // needed for Settings
            return Promise.resolve(null);
        });

        const { baseElement } = render(<App />);
        const screen = within(baseElement);

        // Wait for useTimer to fetch state
        await waitFor(() => {
            expect(screen.getByRole('tab', { name: 'Timer' })).toBeInTheDocument();
            expect(screen.getByText(/Micro-break/)).toBeInTheDocument();
        });
    });

    it('navigates to Settings view', async () => {
        const user = userEvent.setup();
        (invoke as any).mockImplementation((cmd: string) => {
            // Return just enough for components to not crash
            if (cmd === 'get_timer_state') return Promise.resolve({ mode: 'Normal', micro_active: 0, micro_target: 100, rest_target: 1000 });
            if (cmd === 'get_settings') return Promise.resolve({});
            return Promise.resolve(null);
        });

        const { baseElement } = render(<App />);
        const screen = within(baseElement);

        const settingsTab = screen.getByRole('tab', { name: 'Settings' });
        await user.click(settingsTab);

        await waitFor(() => {
            expect(screen.getByText('Save Settings')).toBeInTheDocument();
        });
    });

    it('renders BreakOverlay if window label is overlay', async () => {
        (getCurrentWindow as any).mockImplementation(() => ({
            label: 'overlay',
            hide: mock(() => Promise.resolve())
        }));

        (invoke as any).mockImplementation((cmd: string) => {
            if (cmd === 'get_timer_state') {
                return Promise.resolve({
                    micro_is_overdue: true,
                    rest_is_overdue: false,
                    mode: 'Normal',
                    micro_target: 100,
                    rest_target: 1000
                });
            }
            return Promise.resolve(null);
        });

        const { baseElement } = render(<App />);
        const screen = within(baseElement);

        await waitFor(() => {
            expect(screen.getByText('Microbreak Time!')).toBeInTheDocument();
        });
        // Navigation buttons should NOT be present
        expect(screen.queryByRole('tab', { name: 'Timer' })).toBeNull();
    });
});
