import { AlertTriangle } from '@/components/ui/icons';

// Plain Forma bar charts for attendance. Every value is also printed as text, bars use theme tokens
// (so dark mode follows), and each bar carries a hover title. Values are always the backend's own.

export interface PercentBarRow {
  key: string | number;
  name: string;
  code: string;
  /** Backend attendance percentage; null = nothing to count yet. */
  percentage: number | null;
  belowThreshold: boolean;
  minimum: number;
}

/** One horizontal bar per subject: percentage text, then subject name and code underneath. */
export function SubjectPercentBars({ rows, onSelect }: { rows: PercentBarRow[]; onSelect?: (key: PercentBarRow['key']) => void }) {
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => {
        const pct = r.percentage === null ? null : Number(r.percentage);
        const title = `${r.name} (${r.code}): ${pct === null ? 'no finalized classes yet' : `${pct}%`} · minimum ${r.minimum}%`;
        const body = (
          <>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 h-2.5 rounded-full bg-soft overflow-visible" aria-hidden>
                {pct !== null && (
                  <div className={`h-full rounded-full ${r.belowThreshold ? 'bg-danger' : 'bg-accent'}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                )}
                {/* The minimum required, as a thin tick on the track. */}
                <span className="absolute -top-1 -bottom-1 w-px bg-line-strong" style={{ left: `${Math.min(100, r.minimum)}%` }} />
              </div>
              <span className="w-14 text-right text-[13px] font-[600] text-fg tabular-nums">{pct === null ? '—' : `${pct}%`}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[12px]">
              <span className="text-fg">{r.name}</span>
              <span className="font-mono text-[11px] text-muted">{r.code}</span>
              {pct !== null && r.belowThreshold && (
                <span className="inline-flex items-center gap-1 text-[11px] text-danger"><AlertTriangle className="w-3 h-3" aria-hidden /> Below {r.minimum}%</span>
              )}
              {pct === null && <span className="text-[11px] text-muted">No finalized classes yet</span>}
            </div>
          </>
        );
        return (
          <li key={r.key} title={title}>
            {onSelect ? (
              <button type="button" className="w-full text-left px-5 py-3 hover:bg-soft transition-colors" onClick={() => onSelect(r.key)} aria-label={`${title}. Show this subject`}>
                {body}
              </button>
            ) : (
              <div className="px-5 py-3">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export interface CountBarRow {
  key: string | number;
  label: string;
  sublabel?: string;
  /** Classes conducted (finalized sessions). */
  total: number;
  /** Classes attended (present + on duty), when the figure is about one student. */
  attended?: number;
}

/**
 * Classes conducted vs classes attended. With `attended` set, two bars per row on a shared scale
 * (one axis); without it, only the conducted bar is drawn.
 */
export function ConductedBars({ rows, attendedLabel = 'Attended (present + on duty)' }: { rows: CountBarRow[]; attendedLabel?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  const paired = rows.some((r) => r.attended !== undefined);
  return (
    <div>
      {paired && (
        <div className="px-5 pt-3 flex flex-wrap gap-4 text-[11px] text-muted" aria-hidden>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-line-strong" /> Classes conducted</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-accent" /> {attendedLabel}</span>
        </div>
      )}
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.key} className="px-5 py-3" title={`${r.label}: ${r.total} conducted${r.attended !== undefined ? `, ${r.attended} attended` : ''}`}>
            <div className="flex flex-wrap items-baseline gap-x-2 text-[12px] mb-1.5">
              <span className="text-fg">{r.label}</span>
              {r.sublabel && <span className="font-mono text-[11px] text-muted">{r.sublabel}</span>}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-soft" aria-hidden>
                  <div className="h-full rounded-full bg-line-strong" style={{ width: `${(r.total / max) * 100}%` }} />
                </div>
                <span className="w-24 text-right text-[12px] text-fg tabular-nums">{r.total} conducted</span>
              </div>
              {r.attended !== undefined && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-soft" aria-hidden>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(r.attended / max) * 100}%` }} />
                  </div>
                  <span className="w-24 text-right text-[12px] text-fg tabular-nums">{r.attended} attended</span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Small inline bar for a student's percentage in a table cell. */
export function InlinePercent({ percentage, below }: { percentage: number | null; below: boolean }) {
  if (percentage === null) return null;
  const pct = Number(percentage);
  return (
    <span className="inline-block w-16 h-1.5 rounded-full bg-soft align-middle ml-2" aria-hidden>
      <span className={`block h-full rounded-full ${below ? 'bg-danger' : 'bg-accent'}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </span>
  );
}
