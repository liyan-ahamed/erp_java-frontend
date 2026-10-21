import { Badge } from '@/components/ui/Badge';
import { FieldLabel, PendingTotal } from '@/components/gradebook/shared';
import {
  ASSESSMENT_TYPES,
  ASSESSMENT_TYPE_LABELS,
  GRADE_STATUS_BADGE,
  PENDING_CALCULATION_TEXT,
  formatDate,
  formatMarks,
} from '@/lib/gradebook-labels';
import { AssessmentType, InternalCalculationStatus, InternalMark } from '@/types/gradebook';

// IMPORTANT: this file only displays backend values. Internal-mark formulas are
// not configured yet, so nothing here sums, averages, converts or weights marks.

/** Source-assessment grouping used for display only (not for calculation). */
const THEORY_SOURCE_TYPES: AssessmentType[] = ['CAT_1', 'CAT_2', 'ASSIGNMENT', 'GROUP_PRESENTATION'];
const PRACTICAL_SOURCE_TYPES: AssessmentType[] = ['PRACTICAL', 'RECORD'];

export function CalculationStatusBadge({ status }: { status: InternalCalculationStatus }) {
  return status === 'CALCULATED'
    ? <Badge variant="success">Calculated</Badge>
    : <Badge variant="default">{PENDING_CALCULATION_TEXT}</Badge>;
}

function SourceList({ entry, types }: { entry: InternalMark; types: AssessmentType[] }) {
  const groups = types
    .map((type) => ({ type, results: entry.finalizedAssessmentsByType[type] ?? [] }))
    .filter((g) => g.results.length > 0);

  if (groups.length === 0) {
    return <p className="text-xs text-muted">No finalized assessments yet.</p>;
  }
  return (
    <div className="space-y-3">
      {groups.map(({ type, results }) => (
        <div key={type}>
          <p className="text-xs font-[550] text-muted mb-1">{ASSESSMENT_TYPE_LABELS[type]}</p>
          <ul className="divide-y divide-line border border-line rounded-lg">
            {results.map((r) => {
              const badge = GRADE_STATUS_BADGE[r.gradeStatus];
              return (
                <li key={r.assessmentId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="text-fg truncate">{r.title}</p>
                    <p className="text-[11px] text-muted">{formatDate(r.assessmentDate)}</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    {r.gradeStatus === 'GRADED' ? (
                      <span className="font-[550]">
                        {formatMarks(r.marks)} <span className="text-muted font-normal">/ {formatMarks(r.maxMarks)}</span>
                      </span>
                    ) : (
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function TotalTile({ label, value, outOf }: { label: string; value: number | null; outOf?: number }) {
  return (
    <div className="p-3 bg-soft border border-line rounded-[10px]">
      <p className="text-[10px] font-[550] text-muted uppercase tracking-wider">
        {label}{outOf ? ` / ${outOf}` : ''}
      </p>
      <div className="mt-1 text-lg"><PendingTotal value={value} outOf={outOf} /></div>
    </div>
  );
}

/**
 * Totals and finalized source assessments for one student in one offering.
 * THEORY: one source list + total. THEORY_CUM_PRACTICAL (practicalComponentApplicable):
 * separate Theory / Practical sections + combined total.
 */
export function InternalMarksBreakdown({ entry, practical }: { entry: InternalMark; practical: boolean }) {
  const presentTypes = ASSESSMENT_TYPES.filter((t) => (entry.finalizedAssessmentsByType[t] ?? []).length > 0);
  const listed = practical ? [...THEORY_SOURCE_TYPES, ...PRACTICAL_SOURCE_TYPES] : [];
  const otherTypes = presentTypes.filter((t) => !listed.includes(t));

  if (!practical) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TotalTile label="Theory Internal Total" value={entry.theoryComponentTotal} />
          <TotalTile label="Total Internals" value={entry.totalInternalMarks} />
        </div>
        <div>
          <FieldLabel>Finalized assessments</FieldLabel>
          <div className="mt-2"><SourceList entry={entry} types={ASSESSMENT_TYPES} /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <TotalTile label="Theory Total" value={entry.theoryComponentTotal} outOf={50} />
        <TotalTile label="Practical Total" value={entry.practicalComponentTotal} outOf={50} />
        <TotalTile label="Total" value={entry.totalInternalMarks} outOf={100} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border border-line rounded-[10px]">
          <p className="text-sm font-[550] text-fg mb-3">Theory</p>
          <SourceList entry={entry} types={THEORY_SOURCE_TYPES} />
        </div>
        <div className="p-4 border border-line rounded-[10px]">
          <p className="text-sm font-[550] text-fg mb-3">Practical</p>
          <SourceList entry={entry} types={PRACTICAL_SOURCE_TYPES} />
        </div>
      </div>
      {otherTypes.length > 0 && (
        <div>
          <FieldLabel>Other finalized assessments</FieldLabel>
          <div className="mt-2"><SourceList entry={entry} types={otherTypes} /></div>
        </div>
      )}
    </div>
  );
}
