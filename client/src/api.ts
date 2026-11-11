export type RefTable = 'surnames' | 'streets' | 'buildings' | 'wings';
export type RefItem = { id: number; value: string };
export type References = Record<RefTable, RefItem[]>;
export type Info = { engine: string; version: string; titles: Record<RefTable, string> };

export type RecordForm = {
  surname: string; first_name: string; patronymic: string; street: string;
  building: string; wing: string; appartment: string; tel: string;
};
export type Row = { u_id: number } & { [K in keyof RecordForm]: string | number | null };

/** Поля записи: ключ, подпись и справочник для выпадающего списка. */
export const FIELDS: { key: keyof RecordForm; title: string; ref?: RefTable }[] = [
  { key: 'surname', title: 'Фамилия', ref: 'surnames' },
  { key: 'first_name', title: 'Имя' },
  { key: 'patronymic', title: 'Отчество' },
  { key: 'street', title: 'Улица', ref: 'streets' },
  { key: 'building', title: 'Дом', ref: 'buildings' },
  { key: 'wing', title: 'Корпус', ref: 'wings' },
  { key: 'appartment', title: 'Квартира' },
  { key: 'tel', title: 'Телефон' },
];

export const emptyForm = (): RecordForm =>
  Object.fromEntries(FIELDS.map((f) => [f.key, ''])) as RecordForm;

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message ?? res.statusText);
  return data as T;
}

export const api = {
  info: () => request<Info>('GET', '/api/info'),
  references: () => request<References>('GET', '/api/references'),
  search: (filters: Partial<RecordForm>) =>
    request<Row[]>('GET', '/api/records?' + new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v && v.trim()) as [string, string][])),
  add: (data: RecordForm) => request('POST', '/api/records', data),
  update: (id: number, data: RecordForm) => request('PUT', `/api/records/${id}`, data),
  remove: (id: number) => request('DELETE', `/api/records/${id}`),
  updateReference: (table: RefTable, id: number, value: string) =>
    request('PUT', `/api/references/${table}/${id}`, { value }),
};
