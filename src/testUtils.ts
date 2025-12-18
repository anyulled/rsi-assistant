
export class FakeStore {
    private data: Map<string, unknown> = new Map();

    constructor(initialData: Record<string, unknown> = {}) {
        Object.entries(initialData).forEach(([key, value]) => {
            this.data.set(key, value);
        });
    }

    get<T>(key: string): Promise<T | null> {
        return Promise.resolve((this.data.get(key) as T) ?? null);
    }

    set(key: string, value: unknown): Promise<void> {
        this.data.set(key, value);
        return Promise.resolve();
    }

    save(): Promise<void> {
        return Promise.resolve();
    }
}
