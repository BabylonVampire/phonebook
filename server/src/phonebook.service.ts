import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from './database.service';

/** Справочные (родительские) таблицы: имя → столбец ID, столбец значения, подпись. */
export const REFERENCES = {
  surnames: { id: 'surname_id', value: 'surname', title: 'Фамилии' },
  streets: { id: 'street_id', value: 'street', title: 'Улицы' },
  buildings: { id: 'building_id', value: 'building', title: 'Дома' },
  wings: { id: 'wing_id', value: 'wing', title: 'Корпуса' },
} as const;
export type RefTable = keyof typeof REFERENCES;

export interface RecordData {
  surname: string;
  first_name: string;
  patronymic?: string;
  street: string;
  building: string;
  wing?: string;
  appartment?: string | number;
  tel?: string;
}

const SELECT = `
  SELECT main.u_id, surnames.surname, main.first_name, main.patronymic,
         streets.street, buildings.building, wings.wing, main.appartment, main.tel
  FROM main
  JOIN surnames ON main.surname_id = surnames.surname_id
  JOIN streets ON main.street_id = streets.street_id
  JOIN buildings ON main.building_id = buildings.building_id
  LEFT JOIN wings ON main.wing_id = wings.wing_id`;

const SEARCH_COLUMNS: Record<string, string> = {
  surname: 'surnames.surname',
  first_name: 'main.first_name',
  patronymic: 'main.patronymic',
  street: 'streets.street',
  building: 'buildings.building',
  wing: 'wings.wing',
  appartment: 'CAST(main.appartment AS TEXT)',
  tel: 'main.tel',
};

const MOCK: string[][] = [
  ['Иванов', 'Иван', 'Иванович', 'Ленина', '10', '1', '12', '+7 900 111-11-11'],
  ['Петрова', 'Анна', 'Сергеевна', 'Пушкина', '5', '', '34', '+7 900 222-22-22'],
  ['Сидоров', 'Алексей', 'Николаевич', 'Пушкина', '11', '2', '15', '+7 900 333-33-33'],
  ['Кузнецова', 'Мария', 'Павловна', 'Садовая', '7', 'А', '3', '+7 901 444-44-44'],
  ['Смирнов', 'Дмитрий', 'Олегович', 'Ленина', '10', '2', '48', '+7 902 555-55-55'],
  ['Волкова', 'Елена', 'Игоревна', 'Берёзовая', '42', 'Б', '72', '+7 903 666-66-66'],
  ['Иванов', 'Пётр', 'Иванович', 'Ленина', '10', '1', '12', '+7 900 777-77-77'],
  ['Морозов', 'Сергей', 'Андреевич', 'Гагарина', '3', '', '101', '+7 904 888-88-88'],
  ['Соколова', 'Ольга', 'Викторовна', 'Садовая', '15', '1', '27', '+7 905 999-99-99'],
  ['Лебедев', 'Николай', 'Юрьевич', 'Мира', '21', '3', '9', '+7 906 123-45-67'],
  ['Новикова', 'Татьяна', 'Михайловна', 'Мира', '21', '3', '56', '+7 907 234-56-78'],
  ['Кузнецова', 'Ирина', 'Алексеевна', 'Гагарина', '8', '', '14', '+7 908 345-67-89'],
];

/** Model: схема БД, моковые данные и все SQL-запросы. */
@Injectable()
export class PhonebookService implements OnModuleInit {
  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    await this.db.connect();
    await this.createSchema();
    await this.seed();
  }

  info() {
    return { engine: 'PostgreSQL', version: this.db.version };
  }

  // ---------- схема и моковые данные ----------
  private async createSchema() {
    const pk = 'SERIAL PRIMARY KEY';
    const ddl = [
      `CREATE TABLE IF NOT EXISTS surnames (surname_id ${pk}, surname CHARACTER(30) NOT NULL UNIQUE)`,
      `CREATE TABLE IF NOT EXISTS streets (street_id ${pk}, street CHARACTER(30) NOT NULL UNIQUE)`,
      `CREATE TABLE IF NOT EXISTS buildings (building_id ${pk}, building CHARACTER(10) NOT NULL UNIQUE)`,
      `CREATE TABLE IF NOT EXISTS wings (wing_id ${pk}, wing CHARACTER(30) NOT NULL UNIQUE)`,
      `CREATE TABLE IF NOT EXISTS main (
         u_id ${pk},
         surname_id INTEGER NOT NULL REFERENCES surnames (surname_id),
         first_name CHARACTER(20) NOT NULL,
         patronymic CHARACTER(30),
         street_id INTEGER NOT NULL REFERENCES streets (street_id),
         building_id INTEGER NOT NULL REFERENCES buildings (building_id),
         wing_id INTEGER REFERENCES wings (wing_id),
         appartment INTEGER,
         tel CHARACTER(30))`,
    ];
    for (const sql of ddl) await this.db.query(sql);
  }

  private async seed() {
    const row = await this.db.queryOne('SELECT COUNT(*) AS n FROM main');
    if (Number(row?.n) > 0) return;
    for (const [surname, first_name, patronymic, street, building, wing, appartment, tel] of MOCK) {
      await this.addRecord({ surname, first_name, patronymic, street, building, wing, appartment, tel });
    }
  }

  // ---------- справочники ----------
  static checkTable(table: string): RefTable {
    if (!(table in REFERENCES)) throw new BadRequestException(`Неизвестный справочник «${table}»`);
    return table as RefTable;
  }

  async getReferenceData() {
    const result: Record<string, { id: number; value: string }[]> = {};
    for (const [table, { id, value }] of Object.entries(REFERENCES)) {
      result[table] = (await this.db.query(
        `SELECT ${id} AS id, ${value} AS value FROM ${table} ORDER BY ${value}`,
      )) as { id: number; value: string }[];
    }
    return result;
  }

  /** Возвращает ID значения в справочнике; если значения нет — создаёт новую строку. */
  async getOrCreate(table: RefTable, raw?: string): Promise<number | null> {
    const value = (raw ?? '').trim();
    if (value === '') return null;
    const { id, value: col } = REFERENCES[table];
    const found = await this.db.queryOne(`SELECT ${id} AS id FROM ${table} WHERE ${col} = ?`, [value]);
    if (found) return Number(found.id);
    const created = await this.db.queryOne(
      `INSERT INTO ${table} (${col}) VALUES (?) RETURNING ${id} AS id`,
      [value],
    );
    return Number(created!.id);
  }

  async updateReference(table: RefTable, itemId: number, raw: string) {
    const value = (raw ?? '').trim();
    if (value === '') throw new BadRequestException('Значение не может быть пустым');
    const { id, value: col } = REFERENCES[table];
    const duplicate = await this.db.queryOne(
      `SELECT 1 AS x FROM ${table} WHERE ${col} = ? AND ${id} <> ?`,
      [value, itemId],
    );
    if (duplicate) throw new BadRequestException(`Значение «${value}» уже есть в справочнике`);
    await this.db.query(`UPDATE ${table} SET ${col} = ? WHERE ${id} = ?`, [value, itemId]);
  }

  // ---------- основная таблица ----------
  search(filters: Record<string, string | undefined> = {}) {
    const conditions: string[] = [];
    const params: string[] = [];
    for (const [key, column] of Object.entries(SEARCH_COLUMNS)) {
      const value = (filters[key] ?? '').trim();
      if (value) {
        // ICU-сравнение: регистр кириллицы учитывается одинаково при любой локали базы
        conditions.push(`LOWER(${column} COLLATE "und-x-icu") LIKE LOWER(? COLLATE "und-x-icu")`);
        params.push(`%${value}%`);
      }
    }
    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    return this.db.query(`${SELECT}${where} ORDER BY main.u_id`, params);
  }

  private async prepare(data: RecordData) {
    const required: [keyof RecordData, string][] = [
      ['surname', 'Фамилия'], ['first_name', 'Имя'], ['street', 'Улица'], ['building', 'Дом'],
    ];
    for (const [key, title] of required) {
      if (!String(data[key] ?? '').trim()) throw new BadRequestException(`Поле «${title}» обязательно`);
    }
    const appartment = String(data.appartment ?? '').trim();
    if (appartment && !/^\d+$/.test(appartment)) {
      throw new BadRequestException('Квартира должна быть числом');
    }
    return [
      await this.getOrCreate('surnames', data.surname),
      data.first_name.trim(),
      (data.patronymic ?? '').trim(),
      await this.getOrCreate('streets', data.street),
      await this.getOrCreate('buildings', data.building),
      await this.getOrCreate('wings', data.wing),
      appartment ? Number(appartment) : null,
      (data.tel ?? '').trim(),
    ];
  }

  async addRecord(data: RecordData) {
    await this.db.query(
      `INSERT INTO main (surname_id, first_name, patronymic, street_id,
                         building_id, wing_id, appartment, tel)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      await this.prepare(data),
    );
  }

  async updateRecord(uId: number, data: RecordData) {
    await this.db.query(
      `UPDATE main SET surname_id = ?, first_name = ?, patronymic = ?, street_id = ?,
                       building_id = ?, wing_id = ?, appartment = ?, tel = ?
       WHERE u_id = ?`,
      [...(await this.prepare(data)), uId],
    );
  }

  async deleteRecord(uId: number) {
    await this.db.query('DELETE FROM main WHERE u_id = ?', [uId]);
  }
}
