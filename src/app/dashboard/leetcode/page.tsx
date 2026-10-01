'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink, Pencil, RefreshCw, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  useFetchLeetCodeSection,
  useFetchMyLeetCodeStats,
  useLeetCodeFilters,
  useLeetCodeTop,
  useMyLeetCodeProfile,
  useUpdateLeetCodeUrls,
} from '@/hooks/useLeetCode';
import {
  LeetCodeStudentStats,
  LeetCodeSyncStatus,
  LeetCodeUrlUpdate,
  LeetCodeYear,
  URL_NOT_PROVIDED,
} from '@/types/leetcode';
import { Input } from '@/components/ui/Input';
import { PageContainer } from '@/components/common/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Badge, BadgeProps } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

const SELECT_CLASS =
  'h-10 min-w-44 px-3 text-sm border border-[#E8E8E8] rounded-[10px] bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] disabled:opacity-50 disabled:cursor-not-allowed';

const STATUS_BADGE: Record<LeetCodeSyncStatus, { label: string; variant: BadgeProps['variant'] }> = {
  SYNCED: { label: 'Synced', variant: 'success' },
  NOT_SYNCED: { label: 'Not synced yet', variant: 'default' },
  FAILED: { label: 'Unavailable', variant: 'warning' },
  INVALID_URL: { label: 'Invalid URL', variant: 'error' },
  URL_NOT_PROVIDED: { label: 'No profile', variant: 'default' },
};

const errorMessage = (error: unknown, fallback: string) => {
  const apiMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return apiMessage || (error instanceof Error ? error.message : fallback);
};

const formatSynced = (value: string | null) => (value ? new Date(value).toLocaleString() : 'Never');

const formatCount = (value: number | null) => (value === null || value === undefined ? '—' : value);

/** The editable form of a stored URL: blank when no URL is on record. */
const editableUrl = (student: LeetCodeStudentStats) =>
  student.profileUrl === URL_NOT_PROVIDED ? '' : student.profileUrl;

function ProfileLink({ student }: { student: LeetCodeStudentStats }) {
  if (student.profileUrl === URL_NOT_PROVIDED) {
    return <span className="text-xs font-semibold text-[#9A9A9A]">{URL_NOT_PROVIDED}</span>;
  }
  const href = /^https?:\/\//i.test(student.profileUrl) ? student.profileUrl : `https://${student.profileUrl}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[#2563EB] hover:underline break-all"
    >
      {student.username ?? student.profileUrl}
      <ExternalLink className="w-3 h-3 shrink-0" />
    </a>
  );
}

function StatusBadge({ student }: { student: LeetCodeStudentStats }) {
  const badge = STATUS_BADGE[student.status];
  return (
    <Badge variant={badge.variant} title={student.message ?? undefined}>
      {badge.label}
    </Badge>
  );
}

/** HOD / Staff: choose Year, then Section, then Fetch Data. */
function SectionStatsView() {
  const { data: filters, isLoading: filtersLoading, isError: filtersError } = useLeetCodeFilters();
  const fetchSection = useFetchLeetCodeSection();
  const updateUrls = useUpdateLeetCodeUrls();
  const [year, setYear] = useState<LeetCodeYear | ''>('');
  const [section, setSection] = useState('');
  // Draft URLs by student id; non-null while the results table is in edit mode.
  const [drafts, setDrafts] = useState<Record<number, string> | null>(null);
  const isEditing = drafts !== null;
  // Year whose Top Count is shown; null until the Top Count button is pressed.
  const [topYear, setTopYear] = useState<LeetCodeYear | null>(null);
  const top = useLeetCodeTop(topYear);
  const topStudents = top.data?.pages.flatMap((page) => page.students) ?? [];
  const totalRanked = top.data?.pages[0]?.totalRanked ?? 0;

  const sections = filters?.years.find((option) => option.value === year)?.sections ?? [];
  const result = fetchSection.data;

  const onYearChange = (value: string) => {
    setYear(value as LeetCodeYear | '');
    setSection('');
    setTopYear(null);
    fetchSection.reset();
  };

  const onSectionChange = (value: string) => {
    setSection(value);
    fetchSection.reset();
  };

  const onFetch = () => {
    if (!year || !section) return;
    fetchSection.mutate({ year, section });
  };

  const onTopCount = () => {
    if (!year) return;
    if (topYear === year) {
      top.refetch();
    } else {
      setTopYear(year);
    }
  };

  const onEdit = () => {
    if (!result) return;
    updateUrls.reset();
    setDrafts(Object.fromEntries(result.students.map((s) => [s.studentId, editableUrl(s)])));
  };

  /** DONE: save changed URLs, leave edit mode, then fetch the section again. */
  const onDone = () => {
    if (!result || !drafts) return;
    const changes: LeetCodeUrlUpdate[] = result.students
      .filter((s) => (drafts[s.studentId] ?? '').trim() !== editableUrl(s).trim())
      .map((s) => ({ studentId: s.studentId, profileUrl: (drafts[s.studentId] ?? '').trim() }));
    if (changes.length === 0) {
      setDrafts(null);
      return;
    }
    const target = { year: result.year, section: result.section };
    updateUrls.mutate(
      { ...target, students: changes },
      {
        onSuccess: () => {
          setDrafts(null);
          fetchSection.mutate(target);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex flex-col gap-2">
              <label htmlFor="leetcode-year" className="text-sm font-medium">Year</label>
              <select
                id="leetcode-year"
                value={year}
                onChange={(e) => onYearChange(e.target.value)}
                disabled={filtersLoading || fetchSection.isPending || isEditing}
                className={SELECT_CLASS}
              >
                <option value="">Select year</option>
                {filters?.years.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="leetcode-section" className="text-sm font-medium">Section</label>
              <select
                id="leetcode-section"
                value={section}
                onChange={(e) => onSectionChange(e.target.value)}
                disabled={!year || fetchSection.isPending || isEditing}
                className={SELECT_CLASS}
              >
                <option value="">{year ? 'Select section' : 'Select a year first'}</option>
                {sections.map((name) => (
                  <option key={name} value={name}>Section {name}</option>
                ))}
              </select>
            </div>
            <Button onClick={onFetch} disabled={!year || !section || isEditing} isLoading={fetchSection.isPending}>
              {!fetchSection.isPending && <RefreshCw className="w-4 h-4 mr-2" />}
              {fetchSection.isPending ? 'Fetching...' : 'Fetch Data'}
            </Button>
            <Button variant="outline" onClick={onTopCount} disabled={!year} isLoading={top.isFetching && !top.isFetchingNextPage}>
              {!(top.isFetching && !top.isFetchingNextPage) && <Trophy className="w-4 h-4 mr-2" />}
              Top Count
            </Button>
          </div>
          {filtersError && <p className="mt-4 text-sm text-red-600">Unable to load years and sections.</p>}
          {fetchSection.isPending && (
            <p className="mt-4 text-sm text-[#666666]">
              Fetching the latest statistics from LeetCode for this section. This can take up to a minute.
            </p>
          )}
          {fetchSection.isError && (
            <p className="mt-4 text-sm text-red-600">
              {errorMessage(fetchSection.error, 'Unable to fetch LeetCode statistics.')}
            </p>
          )}
        </CardContent>
      </Card>

      {topYear && (
        <Card>
          <CardHeader>
            <CardTitle>
              Top Count — {filters?.years.find((option) => option.value === topYear)?.label ?? topYear}
            </CardTitle>
            <CardDescription>
              Ranked by total problems solved, using the statistics saved at each section&apos;s last Fetch Data.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {top.isPending ? (
              <div className="p-8 flex justify-center">
                <Spinner size="lg" />
              </div>
            ) : top.isError ? (
              <p className="p-8 text-center text-sm text-red-600">
                {errorMessage(top.error, 'Unable to load the top count.')}
              </p>
            ) : topStudents.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#666666]">
                No LeetCode statistics saved for this year yet. Fetch Data for a section first.
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead className="text-right">Total Solved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topStudents.map((student) => (
                      <TableRow key={student.studentId}>
                        <TableCell className="font-semibold">#{student.rank}</TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="text-[#666666]">Section {student.section}</TableCell>
                        <TableCell className="text-right font-semibold">{student.totalSolved}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-[#E8E8E8]">
                  <span className="text-sm text-[#666666]">
                    Showing {topStudents.length} of {totalRanked}
                  </span>
                  {top.hasNextPage && (
                    <Button variant="outline" size="sm" onClick={() => top.fetchNextPage()} isLoading={top.isFetchingNextPage}>
                      {top.isFetchingNextPage ? 'Loading...' : 'Show next 10'}
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1.5">
                <CardTitle>
                  {filters?.years.find((option) => option.value === result.year)?.label ?? result.year} — Section {result.section}
                </CardTitle>
                <CardDescription>
                  {isEditing
                    ? 'Add or correct LeetCode URLs, then click DONE to save and fetch the latest statistics.'
                    : `${result.totalStudents} students · ${result.synced} synced · ${result.failed} unavailable · ${result.urlNotProvided} without a profile URL`}
                </CardDescription>
              </div>
              {result.students.length > 0 &&
                (isEditing ? (
                  <Button onClick={onDone} isLoading={updateUrls.isPending}>
                    {!updateUrls.isPending && <Check className="w-4 h-4 mr-2" />}
                    {updateUrls.isPending ? 'Saving...' : 'DONE'}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={onEdit}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ))}
            </div>
            {updateUrls.isError && (
              <p className="text-sm text-red-600">
                {errorMessage(updateUrls.error, 'Unable to save LeetCode URLs.')}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {result.students.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#666666]">No students found in this section.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>LeetCode URL</TableHead>
                    <TableHead className="text-right">Total Solved</TableHead>
                    <TableHead className="text-right">Easy</TableHead>
                    <TableHead className="text-right">Medium</TableHead>
                    <TableHead className="text-right">Hard</TableHead>
                    <TableHead>Last Synced</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.students.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className={isEditing ? 'min-w-72' : undefined}>
                        {isEditing ? (
                          <Input
                            type="url"
                            value={drafts[student.studentId] ?? ''}
                            onChange={(e) =>
                              setDrafts((prev) => prev && { ...prev, [student.studentId]: e.target.value })
                            }
                            placeholder="https://leetcode.com/u/username/"
                            aria-label={`LeetCode URL for ${student.name}`}
                            disabled={updateUrls.isPending}
                          />
                        ) : (
                          <ProfileLink student={student} />
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCount(student.totalSolved)}</TableCell>
                      <TableCell className="text-right">{formatCount(student.easySolved)}</TableCell>
                      <TableCell className="text-right">{formatCount(student.mediumSolved)}</TableCell>
                      <TableCell className="text-right">{formatCount(student.hardSolved)}</TableCell>
                      <TableCell className="whitespace-nowrap text-[#666666]">{formatSynced(student.lastSyncedAt)}</TableCell>
                      <TableCell><StatusBadge student={student} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-[12px] border border-[#E8E8E8] p-4">
      <p className="text-xs font-medium text-[#9A9A9A]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#111111]">{formatCount(value)}</p>
    </div>
  );
}

/** Student: their own profile only. */
function MyStatsView() {
  const { data: profile, isLoading, isError, error } = useMyLeetCodeProfile();
  const fetchMine = useFetchMyLeetCodeStats();

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (isError || !profile) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-red-600">{errorMessage(error, 'Unable to load your LeetCode profile.')}</p>
        </CardContent>
      </Card>
    );
  }

  const shown = fetchMine.data ?? profile;
  const hasProfile = shown.profileUrl !== URL_NOT_PROVIDED && shown.status !== 'INVALID_URL';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <CardTitle>{shown.name}</CardTitle>
            <CardDescription>
              <ProfileLink student={shown} />
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge student={shown} />
            {hasProfile && (
              <Button onClick={() => fetchMine.mutate()} isLoading={fetchMine.isPending}>
                {!fetchMine.isPending && <RefreshCw className="w-4 h-4 mr-2" />}
                {fetchMine.isPending ? 'Fetching...' : 'Fetch Data'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Total Solved" value={shown.totalSolved} />
          <StatTile label="Easy Solved" value={shown.easySolved} />
          <StatTile label="Medium Solved" value={shown.mediumSolved} />
          <StatTile label="Hard Solved" value={shown.hardSolved} />
        </div>
        <p className="text-sm text-[#666666]">Last synced: {formatSynced(shown.lastSyncedAt)}</p>
        {shown.status === 'FAILED' && (
          <p className="text-sm text-[#D97706]">
            {shown.message ?? 'LeetCode statistics are unavailable right now.'}
            {shown.lastSyncedAt ? ' Showing the last saved values.' : ''}
          </p>
        )}
        {fetchMine.isError && (
          <p className="text-sm text-red-600">{errorMessage(fetchMine.error, 'Unable to fetch LeetCode statistics.')}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function LeetCodePage() {
  const { user, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const canViewSections = hasRole('ROLE_HOD') || hasRole('ROLE_STAFF');

  useEffect(() => {
    if (!authLoading && !user) router.push('/dashboard');
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  return (
    <PageContainer
      title="LeetCode"
      description={
        canViewSections
          ? 'Select a year and section, then fetch the latest LeetCode statistics'
          : 'Your LeetCode profile and statistics'
      }
    >
      {canViewSections ? <SectionStatsView /> : <MyStatsView />}
    </PageContainer>
  );
}
