import { ReactNode, useState } from 'react';
import { RecordForm, References, RefTable } from './api';
import { Fields } from './Fields';

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Добавление / редактирование абонента. ID только отображается и не меняется. */
export function RecordDialog({ id, initial, refs, onSave, onClose }: {
  id?: number;
  initial: RecordForm;
  refs: References | null;
  onSave: (form: RecordForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const save = () => onSave(form).catch((e: Error) => setError(e.message));
  return (
    <Modal title={id ? 'Редактирование записи' : 'Новая запись'} onClose={onClose}>
      <div className="form">
        <label className="field"><span>ID</span><input value={id ?? 'будет присвоен'} disabled /></label>
        <Fields form={form} refs={refs} idPrefix="dlg" onEnter={save}
                onChange={(k, v) => { setForm({ ...form, [k]: v }); setError(''); }} />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button onClick={onClose}>Отмена</button>
        <button className="primary" onClick={save}>Сохранить</button>
      </div>
    </Modal>
  );
}

/** Редактирование справочников: таблица → значение → новое значение. */
export function ReferenceDialog({ refs, titles, onSave, onClose }: {
  refs: References;
  titles: Record<RefTable, string>;
  onSave: (table: RefTable, id: number, value: string) => Promise<void>;
  onClose: () => void;
}) {
  const [table, setTable] = useState<RefTable>('surnames');
  const [itemId, setItemId] = useState<number | undefined>(refs.surnames[0]?.id);
  const [value, setValue] = useState(refs.surnames[0]?.value ?? '');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const selectTable = (t: RefTable) => {
    setTable(t);
    setItemId(refs[t][0]?.id);
    setValue(refs[t][0]?.value ?? '');
    setMessage(null);
  };
  const selectItem = (id: number) => {
    setItemId(id);
    setValue(refs[table].find((r) => r.id === id)?.value ?? '');
    setMessage(null);
  };
  const save = () => {
    if (itemId === undefined) return;
    onSave(table, itemId, value)
      .then(() => setMessage({ text: 'Сохранено', ok: true }))
      .catch((e: Error) => setMessage({ text: e.message, ok: false }));
  };

  return (
    <Modal title="Справочники" onClose={onClose}>
      <div className="form">
        <label className="field"><span>Таблица</span>
          <select value={table} onChange={(e) => selectTable(e.target.value as RefTable)}>
            {(Object.keys(titles) as RefTable[]).map((t) => <option key={t} value={t}>{titles[t]}</option>)}
          </select>
        </label>
        <label className="field"><span>Значение</span>
          <select value={itemId ?? ''} onChange={(e) => selectItem(Number(e.target.value))}>
            {refs[table].map((r) => <option key={r.id} value={r.id}>{r.value}</option>)}
          </select>
        </label>
        <label className="field"><span>Новое значение</span>
          <input value={value} onChange={(e) => setValue(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && save()} />
        </label>
      </div>
      {message && <p className={message.ok ? 'ok' : 'error'}>{message.text}</p>}
      <div className="actions">
        <button onClick={onClose}>Закрыть</button>
        <button className="primary" onClick={save}>Сохранить</button>
      </div>
    </Modal>
  );
}
