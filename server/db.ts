import fs from 'fs';
import path from 'path';
import type { DatabaseState } from '../src/types.ts';
import { createSeedData } from './seedData.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'office-mystery-db.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export function loadDatabase(): DatabaseState {
  ensureDirectories();
  if (!fs.existsSync(DB_FILE)) {
    const seed = createSeedData();
    saveDatabase(seed);
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseState;
    if (!parsed.users || !parsed.materials || !parsed.games) {
      const seed = createSeedData();
      saveDatabase(seed);
      return seed;
    }
    return parsed;
  } catch {
    const seed = createSeedData();
    saveDatabase(seed);
    return seed;
  }
}

export function saveDatabase(state: DatabaseState): void {
  ensureDirectories();
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}
