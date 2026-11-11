import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolConfig } from 'pg';

export type Row = Record<string, string | number | null>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Подключение к PostgreSQL через пул node-postgres.
 * В SQL используются плейсхолдеры «?», перед отправкой они заменяются на $1, $2…
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  version = '';
  private pool?: Pool;
  private ready?: Promise<void>;
  private readonly log = new Logger('Database');

  connect(): Promise<void> {
    this.ready ??= this.open();
    return this.ready;
  }

  /** Подключается с повторами: в Docker база может стартовать позже приложения. */
  private async open() {
    const attempts = Number(process.env.DB_CONNECT_ATTEMPTS ?? 30);
    for (let i = 1; ; i++) {
      try {
        this.pool = await this.openPool();
        const row = (await this.pool.query('SHOW server_version')).rows[0];
        this.version = String(row.server_version).split(' ')[0];
        this.log.log(`Подключено к PostgreSQL ${this.version}`);
        return;
      } catch (e) {
        if (i >= attempts) throw new Error(`Не удалось подключиться к PostgreSQL: ${(e as Error).message}`);
        this.log.warn(`PostgreSQL недоступен (${(e as Error).message}), попытка ${i}/${attempts}…`);
        await sleep(2000);
      }
    }
  }

  private async openPool(): Promise<Pool> {
    const config: PoolConfig = {
      host: process.env.PGHOST ?? 'localhost',
      port: Number(process.env.PGPORT ?? 5432),
      user: process.env.PGUSER ?? 'phonebook',
      password: process.env.PGPASSWORD ?? '',
      connectionTimeoutMillis: 3000,
    };
    const database = process.env.PGDATABASE ?? 'phonebook';
    const pool = new Pool({ ...config, database });
    try {
      await pool.query('SELECT 1');
      return pool;
    } catch (e) {
      await pool.end();
      if ((e as { code?: string }).code !== '3D000') throw e; // 3D000 — базы не существует
      const admin = new Pool({ ...config, database: 'postgres' });
      try {
        await admin.query(`CREATE DATABASE "${database.replace(/"/g, '')}"`);
      } finally {
        await admin.end();
      }
      this.log.log(`Создана база данных ${database}`);
      const created = new Pool({ ...config, database });
      await created.query('SELECT 1');
      return created;
    }
  }

  /** Выполняет запрос и возвращает строки (для INSERT/UPDATE/DELETE — пустой массив или RETURNING). */
  async query(sql: string, params: unknown[] = []): Promise<Row[]> {
    await this.connect();
    let n = 0;
    const { rows } = await this.pool!.query(sql.replace(/\?/g, () => `$${++n}`), params);
    // CHARACTER(n) дополняется пробелами до длины столбца — убираем их
    return rows.map((r: Row) =>
      Object.fromEntries(
        Object.entries(r).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
      ),
    ) as Row[];
  }

  async queryOne(sql: string, params: unknown[] = []): Promise<Row | undefined> {
    return (await this.query(sql, params))[0];
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }
}
