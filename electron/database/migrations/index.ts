import Database from 'better-sqlite3';
import * as migration001 from './001_initial_schema';
import * as migration002 from './002_seed_data';
import * as migration003 from './003_phase3_schema';

export interface Migration {
  id: string;
  name: string;
  up: (db: Database.Database) => void;
  down: (db: Database.Database) => void;
}

export const migrations: Migration[] = [
  {
    id: '001',
    name: 'initial_schema',
    up: migration001.up,
    down: migration001.down,
  },
  {
    id: '002',
    name: 'seed_data',
    up: migration002.up,
    down: migration002.down,
  },
  {
    id: '003',
    name: 'phase3_schema',
    up: migration003.up,
    down: migration003.down,
  },
];
