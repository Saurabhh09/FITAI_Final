const store = new Map<string, string>();

const mockAsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return store.get(key) ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    store.set(key, String(value));
  },
  removeItem: async (key: string): Promise<void> => {
    store.delete(key);
  },
  clear: async (): Promise<void> => {
    store.clear();
  },
  getAllKeys: async (): Promise<string[]> => {
    return Array.from(store.keys());
  },
};

export default mockAsyncStorage;
