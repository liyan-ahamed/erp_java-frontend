'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ImportItem, ImportKind, ImportStudent, SavedValue, buildImportPlan, savedValueText } from '@/lib/assessment-marks';
import { SpreadsheetError, readSpreadsheet } from '@/lib/spreadsheet';
import { formatMarks } from '@/lib/gradebook-labels';

interface Props {
  students: ImportStudent[];
  /** Each student's value as it stands on screen (null = not entered). */
  current: Map<number, SavedValue | null>;
  maxMarks: number;
  onApply: (values: { studentId: number; value: SavedValue }[]) => void;
  onClose: () => void;
}

const GROUPS: { kind: ImportKind; title: string; tone: string }[] = [
  { kind: 'new', title: 'New marks', tone: 'text-ok' },
  { kind: 'overwrite', title: 'Would overwrite existing marks', tone: 'text-warn' },
  { kind: 'invalid', title: 'Invalid marks — skipped', tone: 'text-danger' },
  { kind: 'unmatched', title: 'Register numbers not in this class — skipped', tone: 'text-danger' },
  { kind: 'duplicate', title: 'Repeated register numbers — skipped', tone: 'text-danger' },
  { kind: 'exempted', title: 'Exempted students — left unchanged', tone: 'text-muted' },
  { kind: 'unchanged', title: 'Same as now — nothing to change', tone: 'text-muted' },
];

/**
 * Import marks from .xlsx / .csv (contract §J): register number + marks ("AB" = absent). Shows what would
 * happen first; existing marks are only replaced when the teacher ticks the overwrite box.
 */
export function MarksImportDialog({ students, current, maxMarks, onApply, onClose }: Props) {
  const [fileName, setFileName] = useState('');
  const [items, setItems] = useState<ImportItem[] | null>(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [overwrite, setOverwrite] = useState(false);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileName(file.name);
    setItems(null);
    setError('');
    setOverwrite(false);
    setReading(true);
    try {
      const table = await readSpreadsheet(file);
      const plan = buildImportPlan(table, students, current, maxMarks);
      if (plan.length === 0) setError('No rows with a register number and marks were found in this file.');
      else setItems(plan);
    } catch (err) {
      setError(err instanceof SpreadsheetError ? err.message : 'This file could not be read.');
    } finally {
      setReading(false);
    }
  };

  const byKind = useMemo(() => {
    const map = new Map<ImportKind, ImportItem[]>();
    items?.forEach((i) => map.set(i.kind, [...(map.get(i.kind) ?? []), i]));
    return map;
  }, [items]);
  const toApply = (items ?? []).filter((i) => i.kind === 'new' || (overwrite && i.kind === 'overwrite'));

  return (
    <Dialog title="Import marks from Excel" onClose={onClose} wide>
      <div className="space-y-4 text-[13px]">
        <p className="text-muted text-[12.5px]">
          Use an <strong className="text-fg">.xlsx</strong> or <strong className="text-fg">.csv</strong> file with a register number column and a
          marks column (out of {formatMarks(maxMarks)}). Write <strong className="text-fg">AB</strong> for absent. Only the first sheet is read.
        </p>
        <label className="f-btn sm cursor-pointer w-fit">
          {reading ? 'Reading…' : fileName ? 'Choose another file' : 'Choose file'}
          <input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={onFile} />
        </label>
        {fileName && <span className="ml-2 text-[12px] text-muted">{fileName}</span>}
        {error && <p className="text-danger" role="alert">{error}</p>}

        {items && (
          <div className="space-y-3">
            <p className="text-[12.5px]" role="status">
              {(byKind.get('new')?.length ?? 0) + (byKind.get('overwrite')?.length ?? 0) + (byKind.get('unchanged')?.length ?? 0)} matched ·{' '}
              {byKind.get('unmatched')?.length ?? 0} unmatched · {byKind.get('invalid')?.length ?? 0} invalid · {byKind.get('overwrite')?.length ?? 0} would overwrite
            </p>
            {GROUPS.filter((g) => byKind.get(g.kind)?.length).map((g) => (
              <details key={g.kind} open={g.kind !== 'unchanged' && g.kind !== 'new'} className="rounded-[10px] border border-line">
                <summary className={`cursor-pointer px-3 py-2 text-[12.5px] font-[550] ${g.tone}`}>
                  {g.title} · {byKind.get(g.kind)!.length}
                </summary>
                <div className="max-h-48 overflow-y-auto border-t border-line">
                  <table className="f-table !text-[11.5px]">
                    <thead>
                      <tr><th>Row</th><th>Register no.</th><th>Student</th><th>File value</th><th>{g.kind === 'overwrite' ? 'Now' : 'Note'}</th></tr>
                    </thead>
                    <tbody>
                      {byKind.get(g.kind)!.map((i) => (
                        <tr key={`${i.line}-${i.registerNumber}`}>
                          <td className="text-muted">{i.line}</td>
                          <td className="font-mono">{i.registerNumber || '—'}</td>
                          <td>{i.name ?? '—'}</td>
                          <td>{i.value ? savedValueText(i.value) : i.rawMarks || '—'}</td>
                          <td className="text-muted">{g.kind === 'overwrite' ? savedValueText(i.current) : i.message ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
            {!!byKind.get('overwrite')?.length && (
              <label className="flex items-start gap-2 text-[12.5px]">
                <input type="checkbox" className="mt-0.5 accent-[var(--accent)]" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
                <span>Replace the {byKind.get('overwrite')!.length} existing mark{byKind.get('overwrite')!.length === 1 ? '' : 's'} listed above with the file&apos;s values.</span>
              </label>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={toApply.length === 0}
            onClick={() => onApply(toApply.map((i) => ({ studentId: i.studentId!, value: i.value! })))}>
            Apply {toApply.length || ''} mark{toApply.length === 1 ? '' : 's'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
