import { useEffect, useState } from "react";

type PersistedData<T> = {
  data: T;
  timestamp: number;
};

/**
 * Hook to persist form data to localStorage
 * @param key - The localStorage key to use
 * @param initialData - The initial form data
 * @returns [data, setData, hasPersistedData, clearData]
 */
export function useFormPersistence<T extends Record<string, any>>(
  key: string,
  initialData: T
) {
  const [data, setData] = useState<T>(initialData);
  const [hasPersistedData, setHasPersistedData] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted data on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed: PersistedData<T> = JSON.parse(stored);
        const timeDiff = Date.now() - parsed.timestamp;
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        // Only restore if less than 24 hours old
        if (hoursDiff < 24) {
          setData(parsed.data);
          setHasPersistedData(true);
        } else {
          // Clear old data
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error("Error loading persisted data:", error);
    } finally {
      setIsLoaded(true);
    }
  }, [key]);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (!isLoaded) return;

    try {
      const persisted: PersistedData<T> = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(persisted));
    } catch (error) {
      console.error("Error saving persisted data:", error);
    }
  }, [data, key, isLoaded]);

  const clearData = () => {
    try {
      localStorage.removeItem(key);
      setData(initialData);
      setHasPersistedData(false);
    } catch (error) {
      console.error("Error clearing persisted data:", error);
    }
  };

  return [data, setData, hasPersistedData, clearData, isLoaded] as const;
}
