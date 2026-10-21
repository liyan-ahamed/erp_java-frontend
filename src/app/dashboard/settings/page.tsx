'use client';

import { FormEvent, ReactNode, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DetailField, FieldLabel, FormError } from '@/components/gradebook/shared';
import { ReadOnlyNote, SuccessNote } from '@/components/erp/shared';
import { useAuth } from '@/contexts/auth-context';
import { accountService } from '@/services/api/account.service';
import { features } from '@/lib/feature-flags';
import { ROLE_LABEL, roleOf } from '@/lib/navigation';
import { ROUTES } from '@/constants/routes';
import { removeAccessToken, removeRefreshToken } from '@/utils/token';

const SELF_SERVICE = features.accountSelfService.enabled;
const UNAVAILABLE = 'Not available yet — the ERP does not support changing this from Account Settings. Contact the HOD office for changes.';

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card>
      <div className="px-5 py-4 border-b border-line">
        <h2 className="text-[14px] font-[550] text-fg">{title}</h2>
        {hint && <p className="text-[12px] text-muted mt-0.5">{hint}</p>}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

/** Change the signed-in user's own email. The backend validates format and uniqueness. */
function ChangeEmail({ current }: { current: string }) {
  const [form, setForm] = useState({ newEmail: '', currentPassword: '' });
  const [problem, setProblem] = useState('');
  const save = useMutation({ mutationFn: accountService.changeEmail, onSuccess: () => window.location.reload() });
  const set = (patch: Partial<typeof form>) => { setForm({ ...form, ...patch }); setProblem(''); };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!SELF_SERVICE) return;
    if (!form.newEmail.trim() || !form.currentPassword) return setProblem('Enter the new email and your current password.');
    if (form.newEmail.trim().toLowerCase() === current.toLowerCase()) return setProblem('That is already your email.');
    save.mutate({ newEmail: form.newEmail.trim(), currentPassword: form.currentPassword });
  };

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md" noValidate>
      <fieldset disabled={!SELF_SERVICE} className="space-y-4 disabled:opacity-60">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="new-email">New email</FieldLabel>
          <Input id="new-email" type="email" autoComplete="email" maxLength={100} value={form.newEmail} onChange={(e) => set({ newEmail: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="email-password">Current password</FieldLabel>
          <Input id="email-password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => set({ currentPassword: e.target.value })} />
        </div>
      </fieldset>
      {problem && <p className="text-sm text-danger" role="alert">{problem}</p>}
      {save.isError && <FormError error={save.error} fallback="Unable to change your email." />}
      <Button type="submit" size="sm" disabled={!SELF_SERVICE} isLoading={save.isPending}>Update Email</Button>
      {!SELF_SERVICE && <p className="text-[12px] text-muted">{UNAVAILABLE}</p>}
    </form>
  );
}

/**
 * Change the signed-in user's own password. The client only checks that fields are filled and match;
 * the backend checks the current password and the password rules. Afterwards the user signs in again.
 */
function ChangePassword() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [problem, setProblem] = useState('');
  const save = useMutation({
    mutationFn: accountService.changePassword,
    onSuccess: () => {
      // The backend may revoke existing tokens; sign out locally and return to the login page either way.
      removeAccessToken();
      removeRefreshToken();
      window.location.href = `${ROUTES.LOGIN}?notice=password-changed`;
    },
  });
  const set = (patch: Partial<typeof form>) => { setForm({ ...form, ...patch }); setProblem(''); };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!SELF_SERVICE) return;
    if (!form.currentPassword || !form.newPassword || !form.confirm) return setProblem('All three fields are required.');
    if (form.newPassword !== form.confirm) return setProblem('The new password and its confirmation do not match.');
    save.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md" noValidate>
      <fieldset disabled={!SELF_SERVICE} className="space-y-4 disabled:opacity-60">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="current-password">Current password</FieldLabel>
          <Input id="current-password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => set({ currentPassword: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <Input id="new-password" type="password" autoComplete="new-password" value={form.newPassword} onChange={(e) => set({ newPassword: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
          <Input id="confirm-password" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => set({ confirm: e.target.value })} />
        </div>
      </fieldset>
      {problem && <p className="text-sm text-danger" role="alert">{problem}</p>}
      {save.isError && <FormError error={save.error} fallback="Unable to change your password." />}
      {save.isSuccess && <SuccessNote>Password changed.</SuccessNote>}
      <Button type="submit" size="sm" disabled={!SELF_SERVICE} isLoading={save.isPending}>Change Password</Button>
      {!SELF_SERVICE && <p className="text-[12px] text-muted">{UNAVAILABLE}</p>}
    </form>
  );
}

function SettingsView() {
  const { user, hasRole } = useAuth();
  const role = roleOf(hasRole);
  if (!user) return null;
  return (
    <PageContainer>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <div className="xl:col-span-2">
          <Section title="Account information" hint="Your details as held by the ERP.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <DetailField label="Name" value={user.name} />
              <DetailField label="Username" value={user.username} />
              <DetailField label="Email" value={user.email} />
              <DetailField label="Phone" value={user.phone || '—'} />
              <DetailField label="Role" value={ROLE_LABEL[role]} />
              {role !== 'STUDENT' && <DetailField label="Staff Code" value={user.staff_code || '—'} />}
              {role !== 'STUDENT' && <DetailField label="Designation" value={user.designation || '—'} />}
            </div>
            <div className="mt-4">
              <ReadOnlyNote>Name, username and role are managed by the HOD and can&apos;t be changed here.</ReadOnlyNote>
            </div>
          </Section>
        </div>
        <Section title="Change email" hint={`Current email: ${user.email}`}>
          <ChangeEmail current={user.email} />
        </Section>
        <Section title="Change password" hint="You will be asked to sign in again afterwards.">
          <ChangePassword />
        </Section>
      </div>
    </PageContainer>
  );
}

export default function SettingsPage() {
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STAFF', 'ROLE_STUDENT']}>
      <SettingsView />
    </RequireRole>
  );
}
