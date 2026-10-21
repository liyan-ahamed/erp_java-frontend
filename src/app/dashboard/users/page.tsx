'use client';

import { FormEvent, useMemo, useState } from 'react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Dialog } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyBlock } from '@/components/gradebook/shared';
import { ContextPrompt } from '@/components/academic/ContextGate';
import { useAuth } from '@/contexts/auth-context';
import { useBatches, useSections } from '@/hooks/useAcademic';
import {
  useCreateUser,
  useDeactivateUser,
  useReactivateUser,
  useUpdateUser,
  useUser,
  useUsersWithRole,
} from '@/hooks/useUsers';
import { getApiErrorMessage } from '@/lib/api-error';
import { cohortLabel, sortCohorts } from '@/lib/academic-context';
import { ROLE_DISPLAY, SingleRole, primaryRole, roleDisplay } from '@/lib/user-roles';
import { ManagedUser } from '@/types/user-management';
import { GraduationCap, Pencil, Plus, Search, UserCheck, UserX, Users } from '@/components/ui/icons';

type View = 'admins' | 'faculty' | 'students';
const VIEW_ROLE: Record<Exclude<View, 'students'>, Exclude<SingleRole, 'ROLE_STUDENT'>> = { admins: 'ROLE_HOD', faculty: 'ROLE_STAFF' };

// Student logins are linked to student records managed elsewhere, so new accounts created here are HOD or
// Faculty. Editing offers all three; every account has exactly one role.
const CREATE_ROLES: SingleRole[] = ['ROLE_HOD', 'ROLE_STAFF'];
const EDIT_ROLES: SingleRole[] = ['ROLE_HOD', 'ROLE_STAFF', 'ROLE_STUDENT'];

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

type ActiveFilter = '' | 'active' | 'inactive';

type Panel =
  | { mode: 'detail'; id: number }
  | { mode: 'create'; role: SingleRole }
  | { mode: 'edit'; user: ManagedUser }
  | null;

function FieldLabel({ children, htmlFor }: { children: string; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="f-label">{children}</label>;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <p className="text-[13px] text-fg mt-1 break-words">{value}</p>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? 'success' : 'default'}>{active ? 'Active' : 'Inactive'}</Badge>;
}

function UserDetail({ id, currentUserId, onEdit }: { id: number; currentUserId: number | undefined; onEdit: (user: ManagedUser) => void }) {
  const { data: user, isLoading, isError, error } = useUser(id);
  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();
  const actionError = deactivate.error ?? reactivate.error;

  if (isLoading) return <div className="py-10 flex justify-center"><Spinner size="lg" /></div>;
  if (isError || !user) return <p className="text-sm text-danger">{getApiErrorMessage(error, 'Unable to load user details.')}</p>;

  const isSelf = user.id === currentUserId;
  const onDeactivate = () => {
    reactivate.reset();
    if (window.confirm(`Deactivate ${user.name}? They will be signed out and unable to log in.`)) deactivate.mutate(user.id);
  };
  const onReactivate = () => {
    deactivate.reset();
    reactivate.mutate(user.id);
  };

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-base font-[550] text-fg">{user.name}</h4>
        <p className="text-sm text-muted">@{user.username}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <StatusBadge active={user.active} />
          <Badge variant="outline">{roleDisplay(user.roles)}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><DetailField label="Email" value={user.email} /></div>
        <DetailField label="Phone" value={user.phone || '—'} />
        <DetailField label="Staff Code" value={user.staff_code || '—'} />
        <DetailField label="Designation" value={user.designation || '—'} />
        <DetailField label="User ID" value={String(user.id)} />
        <DetailField label="Created" value={formatDate(user.created_at)} />
        <DetailField label="Updated" value={formatDate(user.updated_at)} />
      </div>

      {user.permissions.length > 0 && (
        <div>
          <div className="text-[11px] text-muted">Permissions</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[...user.permissions].sort().map((permission) => <Badge key={permission} variant="default">{permission}</Badge>)}
          </div>
        </div>
      )}

      <div className="space-y-3 pt-2 border-t border-line">
        <div className="flex gap-2 pt-3">
          <Button size="sm" variant="secondary" onClick={() => onEdit(user)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
          {user.active ? (
            !isSelf && (
              <Button size="sm" variant="ghost" onClick={onDeactivate} isLoading={deactivate.isPending} className="text-danger hover:text-danger hover:bg-danger-soft">
                {!deactivate.isPending && <UserX className="w-3.5 h-3.5" />} Deactivate
              </Button>
            )
          ) : (
            <Button size="sm" variant="outline" onClick={onReactivate} isLoading={reactivate.isPending}>
              {!reactivate.isPending && <UserCheck className="w-3.5 h-3.5" />} Reactivate
            </Button>
          )}
        </div>
        {isSelf && user.active && <p className="text-xs text-muted">You can&apos;t deactivate your own account.</p>}
        {actionError && <p className="text-sm text-danger">{getApiErrorMessage(actionError, 'Action failed.')}</p>}
      </div>
    </div>
  );
}

interface FormState {
  name: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  staffCode: string;
  designation: string;
  role: SingleRole;
}

const emptyForm = (role: SingleRole): FormState => ({
  name: '', username: '', email: '', password: '', phone: '', staffCode: '', designation: '', role,
});

const formFromUser = (user: ManagedUser): FormState => ({
  name: user.name,
  username: user.username,
  email: user.email,
  password: '',
  phone: user.phone ?? '',
  staffCode: user.staff_code ?? '',
  designation: user.designation ?? '',
  role: primaryRole(user.roles) ?? 'ROLE_STAFF',
});

/** Empty optional fields are omitted rather than sent as blank strings. */
const optional = (value: string) => (value.trim() ? value.trim() : undefined);

function UserForm({ user, initialRole, onSaved }: { user?: ManagedUser; initialRole?: SingleRole; onSaved: (user: ManagedUser) => void }) {
  const isEdit = !!user;
  const [form, setForm] = useState<FormState>(user ? formFromUser(user) : emptyForm(initialRole ?? 'ROLE_STAFF'));
  const create = useCreateUser();
  const update = useUpdateUser();
  const mutation = isEdit ? update : create;
  const roleOptions = isEdit ? EDIT_ROLES : CREATE_ROLES;
  // Older accounts may hold several roles; saving keeps only the selected one.
  const extraRoles = user && user.roles.length > 1 ? user.roles.map((r) => ROLE_DISPLAY[r as SingleRole] ?? r).join(', ') : null;

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((old) => ({ ...old, [field]: e.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const base = {
      name: form.name.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      designation: isEdit ? form.designation.trim() : optional(form.designation),
      phone: isEdit ? form.phone.trim() : optional(form.phone),
      staffCode: optional(form.staffCode),
      // Exactly one role per account.
      roles: [form.role],
    };
    if (user) update.mutate({ id: user.id, payload: base }, { onSuccess: onSaved });
    else create.mutate({ ...base, password: form.password }, { onSuccess: onSaved });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <FieldLabel htmlFor="user-name">Full Name *</FieldLabel>
        <Input id="user-name" value={form.name} onChange={set('name')} required minLength={2} maxLength={100} />
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="user-username">Username *</FieldLabel>
        <Input id="user-username" value={form.username} onChange={set('username')} required minLength={2} maxLength={50} />
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="user-email">Email *</FieldLabel>
        <Input id="user-email" type="email" value={form.email} onChange={set('email')} required maxLength={100} />
      </div>
      {!isEdit && (
        <div className="space-y-1.5">
          <FieldLabel htmlFor="user-password">Password *</FieldLabel>
          <Input id="user-password" type="password" value={form.password} onChange={set('password')} required minLength={8} maxLength={100} autoComplete="new-password" />
          <p className="text-xs text-muted">At least 8 characters.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="user-phone">Phone</FieldLabel>
          <Input id="user-phone" value={form.phone} onChange={set('phone')} maxLength={20} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="user-staff-code">Staff Code</FieldLabel>
          <Input id="user-staff-code" value={form.staffCode} onChange={set('staffCode')} maxLength={20} />
        </div>
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="user-designation">Designation</FieldLabel>
        <Input id="user-designation" value={form.designation} onChange={set('designation')} maxLength={50} />
      </div>
      <fieldset className="space-y-1.5">
        <legend className="f-label">Role *</legend>
        <div className="flex flex-wrap gap-2 mt-1" role="radiogroup" aria-label="Role">
          {roleOptions.map((role) => (
            <label
              key={role}
              className={`flex items-center gap-2 rounded-[10px] border px-3 py-2 text-sm cursor-pointer transition-colors ${
                form.role === role ? 'border-accent bg-accent-soft text-fg' : 'border-line text-fg hover:bg-soft'
              }`}
            >
              <input type="radio" name="user-role" value={role} checked={form.role === role} onChange={() => setForm((old) => ({ ...old, role }))} />
              {ROLE_DISPLAY[role]}
            </label>
          ))}
        </div>
        {extraRoles && <p className="text-xs text-warn">This account currently has several roles ({extraRoles}). Saving keeps only the selected role.</p>}
      </fieldset>

      {mutation.isError && (
        <div className="rounded-[10px] bg-danger-soft p-3 text-sm text-danger border border-danger/20">
          {getApiErrorMessage(mutation.error, isEdit ? 'Unable to update user.' : 'Unable to create user.')}
        </div>
      )}

      <Button type="submit" className="w-full" isLoading={mutation.isPending}>{isEdit ? 'Save Changes' : 'Create User'}</Button>
    </form>
  );
}

/** Admins (HOD accounts) or Faculty (STAFF accounts). Search and status apply to that list only. */
function AccountList({ view, selectedId, onOpen }: { view: Exclude<View, 'students'>; selectedId: number | null; onOpen: (id: number) => void }) {
  const { data, isLoading, isError, error, isFetching } = useUsersWithRole(VIEW_ROLE[view]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('');
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((u) =>
      (activeFilter === '' || u.active === (activeFilter === 'active')) &&
      (!q || [u.name, u.email, u.username, u.staff_code ?? ''].some((v) => v.toLowerCase().includes(q))),
    );
  }, [data, search, activeFilter]);
  const faculty = view === 'faculty';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 w-full sm:max-w-xs">
          <Input icon={<Search className="w-4 h-4" />} aria-label="Search" placeholder={faculty ? 'Search name, email or staff code…' : 'Search name or email…'}
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select aria-label="Status" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)} className="f-select">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {isFetching && !isLoading && <Spinner size="sm" />}
      </div>
      <Card>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-4">
            <Spinner size="lg" />
            <p className="text-muted text-sm">Loading accounts…</p>
          </div>
        ) : isError ? (
          <p className="p-8 text-center text-sm text-danger">{getApiErrorMessage(error, 'Unable to load users.')}</p>
        ) : rows.length === 0 ? (
          <EmptyBlock icon={<Users className="w-10 h-10" />} title={faculty ? 'No faculty accounts found.' : 'No admin accounts found.'} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {faculty && <TableHead className="col-fit">Staff Code</TableHead>}
                <TableHead>Designation</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="col-fit">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((user) => (
                <TableRow key={user.id} className={`cursor-pointer ${selectedId === user.id ? 'bg-soft' : ''}`} onClick={() => onOpen(user.id)}>
                  <TableCell>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted">@{user.username}</div>
                  </TableCell>
                  {faculty && <TableCell className="font-mono text-xs">{user.staff_code || '—'}</TableCell>}
                  <TableCell className="text-muted">{user.designation || '—'}</TableCell>
                  <TableCell className="text-muted">{user.email}</TableCell>
                  <TableCell><StatusBadge active={user.active} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      {data && <p className="text-[12px] text-muted">{rows.length} of {data.length} {faculty ? 'faculty' : 'admin'} account{data.length === 1 ? '' : 's'}.</p>}
    </div>
  );
}

/**
 * Student accounts, found by Cohort → Section. The backend has no student lookup by cohort/section on
 * the user API yet, so after the class is chosen this shows a backend-support state. Students are never
 * reconstructed from the generic user list.
 */
function StudentAccounts() {
  const batches = useBatches();
  const [batchId, setBatchId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const sections = useSections(batchId, batchId !== null);
  const cohorts = sortCohorts(batches.data ?? []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3" role="group" aria-label="Student filters">
        <select aria-label="Cohort" className="f-select max-sm:w-full" value={batchId ?? ''} disabled={batches.isLoading}
          onChange={(e) => { setBatchId(e.target.value ? Number(e.target.value) : null); setSectionId(null); }}>
          <option value="">{batches.isLoading ? 'Loading cohorts…' : 'Select cohort'}</option>
          {cohorts.map((b) => <option key={b.id} value={b.id}>{cohortLabel(b)}</option>)}
        </select>
        <select aria-label="Section" className="f-select max-sm:w-full" value={sectionId ?? ''} disabled={batchId === null || sections.isLoading}
          onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">{batchId === null ? 'Select a cohort first' : sections.isLoading ? 'Loading sections…' : 'Select section'}</option>
          {(sections.data ?? []).map((s) => <option key={s.id} value={s.id}>Section {s.name}</option>)}
        </select>
        <div className="w-full sm:max-w-xs">
          <Input icon={<Search className="w-4 h-4" />} aria-label="Search students" placeholder="Search register no. or name…" disabled />
        </div>
      </div>
      {batchId === null ? (
        <ContextPrompt icon={<GraduationCap className="w-10 h-10" />} title="Select a cohort to begin." hint="Then choose a section to list its student accounts." />
      ) : sectionId === null ? (
        <ContextPrompt icon={<GraduationCap className="w-10 h-10" />} title="Select a section." />
      ) : (
        <ContextPrompt
          icon={<GraduationCap className="w-10 h-10" />}
          title="Student accounts can't be listed by cohort and section yet."
          hint="This needs a backend student lookup (register number, name, login, cohort, section, status). It will appear here once available."
        />
      )}
    </div>
  );
}

function UsersView() {
  const { user: currentUser } = useAuth();
  const [view, setView] = useState<View>('admins');
  const [panel, setPanel] = useState<Panel>(null);
  const selectedId = panel?.mode === 'detail' ? panel.id : panel?.mode === 'edit' ? panel.user.id : null;

  const toolbar = (
    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
      <Tabs label="Account type" value={view} onChange={(v) => { setView(v); setPanel(null); }} className="!mb-0 flex-1"
        items={[{ value: 'admins', label: 'Admins' }, { value: 'faculty', label: 'Faculty' }, { value: 'students', label: 'Students' }] as const} />
      {view !== 'students' && (
        <Button className="sm:mb-2" onClick={() => setPanel({ mode: 'create', role: VIEW_ROLE[view] })}>
          <Plus className="w-4 h-4" /> {view === 'admins' ? 'Add Admin' : 'Add Faculty'}
        </Button>
      )}
    </div>
  );

  return (
    <PageContainer contextArea={toolbar}>
      {view === 'students' ? (
        <StudentAccounts />
      ) : (
        <AccountList key={view} view={view} selectedId={selectedId} onOpen={(id) => setPanel({ mode: 'detail', id })} />
      )}

      {panel?.mode === 'detail' && (
        <Dialog title="User Details" onClose={() => setPanel(null)}>
          <UserDetail id={panel.id} currentUserId={currentUser?.id} onEdit={(user) => setPanel({ mode: 'edit', user })} />
        </Dialog>
      )}
      {panel?.mode === 'create' && (
        <Dialog title={panel.role === 'ROLE_HOD' ? 'Add Admin' : 'Add Faculty'} onClose={() => setPanel(null)}>
          <UserForm initialRole={panel.role} onSaved={(user) => setPanel({ mode: 'detail', id: user.id })} />
        </Dialog>
      )}
      {panel?.mode === 'edit' && (
        <Dialog title="Edit User" onClose={() => setPanel({ mode: 'detail', id: panel.user.id })}>
          <UserForm key={panel.user.id} user={panel.user} onSaved={(user) => setPanel({ mode: 'detail', id: user.id })} />
        </Dialog>
      )}
    </PageContainer>
  );
}

/** User management is HOD-only: STAFF and STUDENT are redirected by RequireRole before any user API runs. */
export default function UsersPage() {
  return (
    <RequireRole roles={['ROLE_HOD']}>
      <UsersView />
    </RequireRole>
  );
}
