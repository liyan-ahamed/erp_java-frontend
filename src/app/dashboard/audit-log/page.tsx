'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { getApiErrorMessage } from '@/lib/api-error';
import { AuditLog } from '@/types/audit';
import { Download, X, Shield } from 'lucide-react';

const PAGE_SIZE = 20;

const formatTimestamp = (ts: string) => {
  const d = new Date(ts);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

const formatShortTime = (ts: string) => {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const actionLabel = (action: string) => action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const entityLabel = (log: AuditLog) =>
  log.entity_type ? `${log.entity_type}${log.entity_id !== null ? ` #${log.entity_id}` : ''}` : '—';

const csvCell = (value: string | number | null) => `"${String(value ?? '').replace(/"/g, '""')}"`;

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">{label}</label>
      <p className={`text-sm text-[#111111] mt-1 break-words ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}

/** Values are shown exactly as returned — the backend has already redacted sensitive data. */
function ValueBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">{label}</label>
      <pre className="text-xs text-[#666666] mt-1 p-3 bg-[#FAFAFA] rounded-[10px] border border-[#E8E8E8] overflow-x-auto whitespace-pre-wrap break-all">
        {value}
      </pre>
    </div>
  );
}

function AuditLogView() {
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data, isLoading, isError, error } = useAuditLogs({ page, size: PAGE_SIZE });

  const exportPageCsv = () => {
    if (!data) return;
    const headers = ['Timestamp', 'User', 'Module', 'Action', 'Entity', 'IP Address'];
    const rows = data.content.map(l => [
      l.timestamp, l.username, l.module, l.action, entityLabel(l), l.ip_address,
    ]);
    const csv = [headers.map(csvCell).join(','), ...rows.map(r => r.map(csvCell).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-page-${page + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toolbar = (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-[#666666]">Most recent activity first.</p>
      <Button variant="outline" size="md" onClick={exportPageCsv} disabled={!data || data.content.length === 0}>
        <Download className="w-4 h-4 mr-1.5" /> Export This Page
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <Spinner size="lg" />
          <p className="text-[#666666] font-medium text-sm">Loading audit logs...</p>
        </div>
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <div className="p-5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl">
          <h3 className="font-bold text-sm mb-1 text-[#DC2626]">Error Loading Audit Logs</h3>
          <p className="text-sm text-[#DC2626]">{getApiErrorMessage(error, 'Failed to load audit logs.')}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer contextArea={toolbar} rawLayout={true}>
      <div className="flex gap-6">
        {/* Audit Table */}
        <div className="flex-1 min-w-0">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.content.map((log) => (
                  <TableRow
                    key={log.id}
                    className={`cursor-pointer ${selectedLog?.id === log.id ? 'bg-[#F5F5F5]' : ''}`}
                    onClick={() => setSelectedLog(log)}
                  >
                    <TableCell className="whitespace-nowrap text-[#666666]">
                      {formatShortTime(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{log.username || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[#666666]">{log.module}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{actionLabel(log.action)}</span>
                    </TableCell>
                    <TableCell className="text-[#666666]">{entityLabel(log)}</TableCell>
                    <TableCell className="text-[#9A9A9A] font-mono text-xs">
                      {log.ip_address || '—'}
                    </TableCell>
                  </TableRow>
                ))}

                {data?.content.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Shield className="w-8 h-8 text-[#D4D4D4]" />
                        <span className="text-sm text-[#666666]">No audit logs found</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {data && (
              <Pagination
                data={data}
                onPageChange={(next) => {
                  setPage(next);
                  setSelectedLog(null);
                }}
              />
            )}
          </Card>
        </div>

        {/* Detail Side Panel */}
        {selectedLog && (
          <div className="hidden lg:block w-[400px] flex-shrink-0">
            <Card className="sticky top-4">
              <div className="px-6 py-4 border-b border-[#F5F5F5] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#111111]">Audit Detail</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] text-[#9A9A9A] hover:text-[#111111] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <CardContent className="p-6 space-y-5">
                <div>
                  <h4 className="text-base font-semibold text-[#111111] mb-2">{actionLabel(selectedLog.action)}</h4>
                  <Badge variant="outline">{selectedLog.module}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Performed By" value={selectedLog.username || '—'} />
                  <DetailField label="User ID" value={selectedLog.user_id !== null ? String(selectedLog.user_id) : '—'} />
                  <DetailField label="Timestamp" value={formatTimestamp(selectedLog.timestamp)} />
                  <DetailField label="Entity" value={entityLabel(selectedLog)} />
                  <DetailField label="IP Address" value={selectedLog.ip_address || '—'} mono />
                  <DetailField label="Log ID" value={String(selectedLog.id)} />
                </div>

                {selectedLog.user_agent && (
                  <DetailField label="User Agent" value={selectedLog.user_agent} mono />
                )}

                {(selectedLog.old_value || selectedLog.new_value) && (
                  <div className="space-y-3 pt-2 border-t border-[#F5F5F5]">
                    {selectedLog.old_value && <ValueBlock label="Before Value" value={selectedLog.old_value} />}
                    {selectedLog.new_value && <ValueBlock label="After Value" value={selectedLog.new_value} />}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

export default function AuditLogPage() {
  return (
    <RequireRole roles={['ROLE_HOD']}>
      <AuditLogView />
    </RequireRole>
  );
}
