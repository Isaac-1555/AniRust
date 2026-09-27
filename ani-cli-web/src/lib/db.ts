import Database from '@tauri-apps/plugin-sql';
import type { HistoryItem, Preferences } from './types';

let dbPromise: Promise<Database> | null = null;

function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load('sqlite:anime.db');
  }
  return dbPromise;
}

export async function initDb(): Promise<void> {
  const db = await getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anime_id TEXT NOT NULL,
      title TEXT NOT NULL,
      episode INTEGER NOT NULL,
      quality TEXT NOT NULL,
      mode TEXT NOT NULL,
      played_at INTEGER NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

export async function loadHistory(): Promise<HistoryItem[]> {
  const db = await getDb();
  return db.select<HistoryItem[]>(
    'SELECT * FROM history ORDER BY played_at DESC LIMIT 100'
  );
}

export async function insertHistory(
  item: Omit<HistoryItem, 'id'>
): Promise<HistoryItem> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO history (anime_id, title, episode, quality, mode, played_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [item.anime_id, item.title, item.episode, item.quality, item.mode, item.played_at]
  );
  return { ...item, id: Number(result.lastInsertId) };
}

export async function deleteHistoryItem(id: number): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM history WHERE id = $1', [id]);
}

export async function clearHistory(): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM history');
}

export async function loadPreferences(): Promise<Partial<Preferences>> {
  const db = await getDb();
  const rows = await db.select<{ key: string; value: string }[]>(
    'SELECT key, value FROM preferences'
  );
  const prefs: Partial<Preferences> = {};
  for (const row of rows) {
    if (row.key === 'quality') prefs.quality = row.value;
    if (row.key === 'mode') prefs.mode = row.value as Preferences['mode'];
    if (row.key === 'player') prefs.player = row.value;
  }
  return prefs;
}

export async function savePreference(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO preferences (key, value) VALUES ($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}
