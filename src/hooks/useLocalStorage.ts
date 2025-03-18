import { useState, useEffect } from 'react';

/**
 * A custom hook for using localStorage with React.
 * Provides type-safe access and synchronizes changes across components.
 * 
 * @param key The localStorage key
 * @param initialValue The default value if none exists in localStorage
 * @returns A stateful value and a function to update it
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        
        // Dispatch a custom event so other instances can update
        window.dispatchEvent(new Event('local-storage-change'));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Listen for changes to this localStorage key in other components
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.error(`Error reading localStorage key "${key}" on storage event:`, error);
      }
    };

    // Listen for the custom event
    window.addEventListener('local-storage-change', handleStorageChange);
    // Also listen for the standard storage event (for changes from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('local-storage-change', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue];
} 