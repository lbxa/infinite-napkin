import { useState, useEffect, useCallback } from 'react';
import { initSqlite } from '../lib/sqlite';
import { createDrizzleDb, runMigrations, type DrizzleDb } from '../lib/drizzle';

interface UseDbResult {
  db: DrizzleDb | null;
  isLoading: boolean;
  error: Error | null;
  reinitialize: () => Promise<void>;
}

export function useDb(): UseDbResult {
  const [db, setDb] = useState<DrizzleDb | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await initSqlite();
      await runMigrations();
      const drizzleDb = createDrizzleDb();
      setDb(drizzleDb);
    } catch (e) {
      console.error('Database initialization error:', e);
      setError(e instanceof Error ? e : new Error('Unknown database error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return { db, isLoading, error, reinitialize: initialize };
}


