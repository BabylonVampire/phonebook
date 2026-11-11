import { useCallback, useEffect, useState } from 'react';
import { api, emptyForm, FIELDS, Info, RecordForm, References, Row } from './api';
import { RecordDialog, ReferenceDialog } from './dialogs';
import { Fields } from './Fields';

type Dialog = { kind: 'add' } | { kind: 'edit'; row: Row } | { kind: 'refs' } | null;

const toForm = (row: Row): RecordForm =>
  Object.fromEntries(FIELDS.map((f) => [f.key, row[f.key] == null ? '' : String(row[f.key])])) as RecordForm;

export default function App() {
  const [info, setInfo] = useState<Info | null>(null);
  const [refs, setRefs] = useState<References | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [filters, setFilters] = useState<RecordForm>(emptyForm);
  const [selected, setSelected] = useState<number | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState('');

  /** Обновляет выпадающие списки и таблицу по заданному фильтру. */
  const refresh = useCallback(async (f: RecordForm) => {
    try {
      const [r, data] = await Promise.all([api.references(), api.search(f)]);
      setRefs(r);
      setRows(data);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    api.info().then(setInfo).catch((e: Error) => setError(e.message));
    refresh(emptyForm());
  }, [refresh]);

  const selectedRow = rows.find((r) => r.u_id === selected);
  const needSelection = () => { alert('Выберите запись в таблице'); };

  const reset = () => { const f = emptyForm(); setFilters(f); refresh(f); };
  const edit = () => (selectedRow ? setDialog({ kind: 'edit', row: selectedRow }) : needSelection());
  const remove = async () => {
    if (!selectedRow) return needSelection();
    if (!confirm(`Удалить запись №${selectedRow.u_id} (${selectedRow.surname} ${selectedRow.first_name})?`)) return;
    try {
      await api.remove(selectedRow.u_id);
      setSelected(null);
      await refresh(filters);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const afterSave = async () => { setDialog(null); await refresh(filters); };

  return (
    <div className="app">
      <fieldset className="filters">
        <legend>Параметры поиска</legend>
        <Fields form={filters} refs={refs} idPrefix="flt" onEnter={() => refresh(filters)}
                onChange={(k, v) => setFilters({ ...filters, [k]: v })} />
      </fieldset>

      <div className="toolbar">
        <button className="primary" onClick={() => refresh(filters)}>Поиск</button>
        <button onClick={() => setDialog({ kind: 'add' })}>Добавить</button>
        <button onClick={edit}>Редактировать выбранную</button>
        <button onClick={remove}>Удалить выбранную</button>
        <button onClick={() => setDialog({ kind: 'refs' })} disabled={!refs || !info}>Редактировать справочники</button>
        <button onClick={reset}>Сбросить фильтр</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th>{FIELDS.map((f) => <th key={f.key}>{f.title}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.u_id} className={r.u_id === selected ? 'selected' : ''}
                  onClick={() => setSelected(r.u_id)}
                  onDoubleClick={() => { setSelected(r.u_id); setDialog({ kind: 'edit', row: r }); }}>
                <td>{r.u_id}</td>
                {FIELDS.map((f) => <td key={f.key}>{r[f.key] ?? ''}</td>)}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9} className="empty">Записей не найдено</td></tr>}
          </tbody>
        </table>
      </div>

      <footer>
        Найдено записей: {rows.length}
        {info && <> · БД: {info.engine} {info.version}</>}
        {error && <span className="error"> · {error}</span>}
      </footer>

      {dialog?.kind === 'add' && (
        <RecordDialog initial={emptyForm()} refs={refs} onClose={() => setDialog(null)}
                      onSave={(f) => api.add(f).then(afterSave)} />
      )}
      {dialog?.kind === 'edit' && (
        <RecordDialog id={dialog.row.u_id} initial={toForm(dialog.row)} refs={refs}
                      onClose={() => setDialog(null)}
                      onSave={(f) => api.update(dialog.row.u_id, f).then(afterSave)} />
      )}
      {dialog?.kind === 'refs' && refs && info && (
        <ReferenceDialog refs={refs} titles={info.titles} onClose={() => setDialog(null)}
                         onSave={async (t, id, v) => { await api.updateReference(t, id, v); await refresh(filters); }} />
      )}
    </div>
  );
}
