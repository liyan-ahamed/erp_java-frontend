'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/auth-context';
import {
  useCreateUser,
  useDeactivateUser,
  useReactivateUser,
  useUpdateUser,
  useUser,
  useUsers,
} from '@/hooks/useUsers';
import { getApiErrorMessage } from '@/lib/api-error';
import { ManagedUser } from '@/types/user-management';
import { Pencil, Plus, Search, UserCheck, UserX, Users, X } from 'lucide-react';

const PAGE_SIZE = 10;

const SELECT_CLASS =
  'h-10 px-3 text-sm border border-[#E8E8E8] rounded-[10px] bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]';

const ROLE_LABELS: Record<string, string> = {
  ROLE_HOD: 'HOD',
  ROLE_STAFF: 'Staff',
  ROLE_STUDENT: 'Student',
};

// Student logins are linked to student records managed elsewhere, so new
// accounts created here are HOD or Staff. Editing shows every role.
const CREATE_ROLES = ['ROLE_HOD', 'ROLE_STAFF'];
const EDIT_ROLES = ['ROLE_HOD', 'ROLE_STAFF', 'ROLE_STUDENT'];

const roleLabel = (role: string) => ROLE_LABELS[role] ?? role;

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

type ActiveFilter = '' | 'active' | 'inactive';

type Panel =
  | { mode: 'detail'; id: number }
  | { mode: 'create' }
  | { mode: 'edit'; user: ManagedUser }
  | null;

function FieldLabel({ children }: { children: string }) {
  return <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">{children}</label>;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <p className="text-sm text-[#111111] mt-1 break-words">{value}</p>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? 'success' : 'default'}>{active ? 'Active' : 'Inactive'}</Badge>;
}

function PanelShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="w-full lg:w-[400px] flex-shrink-0">
      <Card className="lg:sticky lg:top-4">
        <div className="px-6 py-4 border-b border-[#F5F5F5] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#111111]">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] text-[#9A9A9A] hover:text-[#111111] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    </div>
  );
}

function UserDetail({
  id,
  canManage,
  currentUserId,
  onEdit,
}: {
  id: number;
  canManage: boolean;
  currentUserId: number | undefined;
  onEdit: (user: ManagedUser) => void;
}) {
  const { data: user, isLoading, isError, error } = useUser(id);
  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();
  const actionError = deactivate.error ?? reactivate.error;

  if (isLoading) {
    return (
      <div className="py-10 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (isError || !user) {
    return <p className="text-sm text-red-600">{getApiErrorMessage(error, 'Unable to load user details.')}</p>;
  }

  const isSelf = user.id === currentUserId;

  const onDeactivate = () => {
    reactivate.reset();
    if (window.confirm(`Deactivate ${user.name}? They will be signed out and unable to log in.`)) {
      deactivate.mutate(user.id);
    }
  };

  const onReactivate = () => {
    deactivate.reset();
    reactivate.mutate(user.id);
  };

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-base font-semibold text-[#111111]">{user.name}</h4>
        <p className="text-sm text-[#666666]">@{user.username}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <StatusBadge active={user.active} />
          {user.roles.map((role) => (
            <Badge key={role} variant="outline">{roleLabel(role)}</Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <DetailField label="Email" value={user.email} />
        </div>
        <DetailField label="Phone" value={user.phone || '—'} />
        <DetailField label="Staff Code" value={user.staff_code || '—'} />
        <DetailField label="Designation" value={user.designation || '—'} />
        <DetailField label="User ID" value={String(user.id)} />
        <DetailField label="Created" value={formatDate(user.created_at)} />
        <DetailField label="Updated" value={formatDate(user.updated_at)} />
      </div>

      {user.permissions.length > 0 && (
        <div>
          <FieldLabel>Permissions</FieldLabel>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[...user.permissions].sort().map((permission) => (
              <Badge key={permission} variant="default">{permission}</Badge>
            ))}
          </div>
        </div>
      )}

      {canManage && (
        <div className="space-y-3 pt-2 border-t border-[#F5F5F5]">
          <div className="flex gap-2 pt-3">
            <Button size="sm" variant="secondary" onClick={() => onEdit(user)}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
            </Button>
            {user.active ? (
              !isSelf && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDeactivate}
                  isLoading={deactivate.isPending}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  {!deactivate.isPending && <UserX className="w-3.5 h-3.5 mr-1.5" />} Deactivate
                </Button>
              )
            ) : (
              <Button size="sm" variant="outline" onClick={onReactivate} isLoading={reactivate.isPending}>
                {!reactivate.isPending && <UserCheck className="w-3.5 h-3.5 mr-1.5" />} Reactivate
              </Button>
            )}
          </div>
          {isSelf && user.active && (
            <p className="text-xs text-[#9A9A9A]">You can&apos;t deactivate your own account.</p>
          )}
          {actionError && <p className="text-sm text-red-600">{getApiErrorMessage(actionError, 'Action failed.')}</p>}
        </div>
      )}
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
  roles: string[];
}

const emptyForm: FormState = {
  name: '',
  username: '',
  email: '',
  password: '',
  phone: '',
  staffCode: '',
  designation: '',
  roles: ['ROLE_STAFF'],
};

const formFromUser = (user: ManagedUser): FormState => ({
  name: user.name,
  username: user.username,
  email: user.email,
  password: '',
  phone: user.phone ?? '',
  staffCode: user.staff_code ?? '',
  designation: user.designation ?? '',
  roles: [...user.roles],
});

/** Empty optional fields are omitted rather than sent as blank strings. */
const optional = (value: string) => (value.trim() ? value.trim() : undefined);

function UserForm({ user, onSaved }: { user?: ManagedUser; onSaved: (user: ManagedUser) => void }) {
  const isEdit = !!user;
  const [form, setForm] = useState<FormState>(user ? formFromUser(user) : emptyForm);
  const create = useCreateUser();
  const update = useUpdateUser();
  const mutation = isEdit ? update : create;
  const roleOptions = isEdit ? EDIT_ROLES : CREATE_ROLES;

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((old) => ({ ...old, [field]: e.target.value }));

  const toggleRole = (role: string) =>
    setForm((old) => ({
      ...old,
      roles: old.roles.includes(role) ? old.roles.filter((r) => r !== role) : [...old.roles, role],
    }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const base = {
      name: form.name.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      designation: isEdit ? form.designation.trim() : optional(form.designation),
      phone: isEdit ? form.phone.trim() : optional(form.phone),
      staffCode: optional(form.staffCode),
      roles: form.roles,
    };
    if (user) {
      update.mutate({ id: user.id, payload: base }, { onSuccess: onSaved });
    } else {
      create.mutate({ ...base, password: form.password }, { onSuccess: onSaved });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <FieldLabel>Full Name *</FieldLabel>
        <Input value={form.name} onChange={set('name')} required minLength={2} maxLength={100} />
      </div>
      <div className="space-y-1.5">
        <FieldLabel>Username *</FieldLabel>
        <Input value={form.username} onChange={set('username')} required minLength={2} maxLength={50} />
      </div>
      <div className="space-y-1.5">
        <FieldLabel>Email *</FieldLabel>
        <Input type="email" value={form.email} onChange={set('email')} required maxLength={100} />
      </div>
      {!isEdit && (
        <div className="space-y-1.5">
          <FieldLabel>Password *</FieldLabel>
          <Input
            type="password"
            value={form.password}
            onChange={set('password')}
            required
            minLength={8}
            maxLength={100}
            autoComplete="new-password"
          />
          <p className="text-xs text-[#9A9A9A]">At least 8 characters.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <FieldLabel>Phone</FieldLabel>
          <Input value={form.phone} onChange={set('phone')} maxLength={20} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Staff Code</FieldLabel>
          <Input value={form.staffCode} onChange={set('staffCode')} maxLength={20} />
        </div>
      </div>
      <div className="space-y-1.5">
        <FieldLabel>Designation</FieldLabel>
        <Input value={form.designation} onChange={set('designation')} maxLength={50} />
      </div>
      <div className="space-y-1.5">
        <FieldLabel>Roles *</FieldLabel>
        <div className="flex flex-wrap gap-2 mt-1">
          {roleOptions.map((role) => (
            <label
              key={role}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                form.roles.includes(role) ? 'border-[#111111]' : 'border-[#E8E8E8]'
              }`}
            >
              <input type="checkbox" checked={form.roles.includes(role)} onChange={() => toggleRole(role)} />
              {roleLabel(role)}
            </label>
          ))}
        </div>
      </div>

      {mutation.isError && (
        <div className="rounded-[10px] bg-red-50 p-3 text-sm text-red-600 border border-red-100">
          {getApiErrorMessage(mutation.error, isEdit ? 'Unable to update user.' : 'Unable to create user.')}
        </div>
      )}

      <Button type="submit" className="w-full" isLoading={mutation.isPending} disabled={form.roles.length === 0}>
        {isEdit ? 'Save Changes' : 'Create User'}
      </Button>
      {form.roles.length === 0 && <p className="text-xs text-red-500">Select at least one role.</p>}
    </form>
  );
}

function UsersView() {
  const { user: currentUser, hasRole } = useAuth();
  const canManage = hasRole('ROLE_HOD');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('');
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);

  // Search runs on the server; wait for typing to pause before querying.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, error, isFetching } = useUsers({
    page,
    size: PAGE_SIZE,
    search,
    active: activeFilter === '' ? undefined : activeFilter === 'active',
  });

  const filtersBar = (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex-1 w-full sm:max-w-xs">
        <Input
          icon={<Search className="w-4 h-4" />}
          placeholder="Search by name or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>
      <select
        value={activeFilter}
        onChange={(e) => {
          setActiveFilter(e.target.value as ActiveFilter);
          setPage(0);
        }}
        className={SELECT_CLASS}
      >
        <option value="">All Users</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      {isFetching && !isLoading && <Spinner size="sm" />}
      {canManage && (
        <Button className="sm:ml-auto" onClick={() => setPanel({ mode: 'create' })}>
          <Plus className="w-4 h-4 mr-1.5" /> Add User
        </Button>
      )}
    </div>
  );

  const selectedId = panel?.mode === 'detail' ? panel.id : panel?.mode === 'edit' ? panel.user.id : null;

  return (
    <PageContainer contextArea={filtersBar} rawLayout={true}>
      <div className="flex flex-col-reverse lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <Card>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Spinner size="lg" />
                <p className="text-[#666666] font-medium text-sm">Loading users...</p>
              </div>
            ) : isError ? (
              <p className="p-8 text-center text-sm text-red-600">{getApiErrorMessage(error, 'Unable to load users.')}</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.content.map((user) => (
                      <TableRow
                        key={user.id}
                        className={`cursor-pointer ${selectedId === user.id ? 'bg-[#F5F5F5]' : ''}`}
                        onClick={() => setPanel({ mode: 'detail', id: user.id })}
                      >
                        <TableCell>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-[#9A9A9A]">@{user.username}</div>
                        </TableCell>
                        <TableCell className="text-[#666666]">{user.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role) => (
                              <Badge key={role} variant="outline">{roleLabel(role)}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-[#666666]">{user.designation || '—'}</TableCell>
                        <TableCell>
                          <StatusBadge active={user.active} />
                        </TableCell>
                      </TableRow>
                    ))}

                    {data?.content.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="w-8 h-8 text-[#D4D4D4]" />
                            <span className="text-sm text-[#666666]">No users found</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {data && <Pagination data={data} onPageChange={setPage} />}
              </>
            )}
          </Card>
        </div>

        {panel?.mode === 'detail' && (
          <PanelShell title="User Details" onClose={() => setPanel(null)}>
            <UserDetail
              id={panel.id}
              canManage={canManage}
              currentUserId={currentUser?.id}
              onEdit={(user) => setPanel({ mode: 'edit', user })}
            />
          </PanelShell>
        )}

        {canManage && panel?.mode === 'create' && (
          <PanelShell title="Add User" onClose={() => setPanel(null)}>
            <UserForm onSaved={(user) => setPanel({ mode: 'detail', id: user.id })} />
          </PanelShell>
        )}

        {canManage && panel?.mode === 'edit' && (
          <PanelShell title="Edit User" onClose={() => setPanel({ mode: 'detail', id: panel.user.id })}>
            <UserForm
              key={panel.user.id}
              user={panel.user}
              onSaved={(user) => setPanel({ mode: 'detail', id: user.id })}
            />
          </PanelShell>
        )}
      </div>
    </PageContainer>
  );
}

export default function UsersPage() {
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STAFF']}>
      <UsersView />
    </RequireRole>
  );
}
