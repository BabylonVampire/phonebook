import { FIELDS, RecordForm, References } from './api';

/** Набор полей записи. Справочные поля — ввод с подсказками из справочника (datalist):
 *  можно выбрать существующее значение или ввести новое. */
export function Fields({ form, refs, onChange, onEnter, idPrefix }: {
  form: RecordForm;
  refs: References | null;
  onChange: (key: keyof RecordForm, value: string) => void;
  onEnter?: () => void;
  idPrefix: string;
}) {
  return (
    <>
      {FIELDS.map((f) => (
        <label key={f.key} className="field">
          <span>{f.title}</span>
          <input
            name={f.key}
            value={form[f.key]}
            list={f.ref ? `${idPrefix}-${f.ref}` : undefined}
            onChange={(e) => onChange(f.key, e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
            autoComplete="off"
          />
          {f.ref && (
            <datalist id={`${idPrefix}-${f.ref}`}>
              {refs?.[f.ref].map((r) => <option key={r.id} value={r.value} />)}
            </datalist>
          )}
        </label>
      ))}
    </>
  );
}
