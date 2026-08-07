'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/common/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Spinner } from '@/components/ui/Spinner';
import { useAuditLogs, useAuditLogDetail } from '@/hooks/useAuditLogs';
import { AuditLogFilters, AuditLog } from '@/types/audit';
import { AUDIT_MODULES, AUDIT_ACTIONS } from '@/data/audit-data';
import { Search, Download, X, ChevronLeft, ChevronRight, Shield, ExternalLink } from 'lucide-react';

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

export default function AuditLogPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({
    search: '',
    module: '',
    action: '',
    status: '',
    page: 0,
    size: 15,
  });
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);

  const { data, isLoading } = useAuditLogs(filters);
  const { data: detailLog } = useAuditLogDetail(selectedLogId);

  const exportCsv = () => {
    if (!data) return;
    const headers = ['Timestamp', 'User', 'Role', 'Module', 'Action', 'Status', 'IP Address', 'Description'];
    const rows = data.content.map(l => [
      formatTimestamp(l.timestamp), l.username, l.role || '', l.module,
      actionLabel(l.action), l.status || '', l.ip_address, l.description || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseJson = (str: string | null): Record<string, unknown> | null => {
    if (!str) return null;
    try { return JSON.parse(str); } catch { return null; }
  };

  const filtersBar = (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex-1 w-full sm:max-w-xs">
        <Input
          icon={<Search className="w-4 h-4" />}
          placeholder="Search audit logs..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 0 })}
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={filters.module}
          onChange={(e) => setFilters({ ...filters, module: e.target.value, page: 0 })}
          className="h-10 px-3 text-sm border border-[#E8E8E8] rounded-[10px] bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
        >
          <option value="">All Modules</option>
          {AUDIT_MODULES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 0 })}
          className="h-10 px-3 text-sm border border-[#E8E8E8] rounded-[10px] bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
        >
          <option value="">All Actions</option>
          {AUDIT_ACTIONS.map(a => <option key={a} value={a}>{actionLabel(a)}</option>)}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 0 })}
          className="h-10 px-3 text-sm border border-[#E8E8E8] rounded-[10px] bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
        >
          <option value="">All Status</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
        </select>
        <Button variant="outline" size="md" onClick={exportCsv}>
          <Download className="w-4 h-4 mr-1.5" /> Export
        </Button>
      </div>
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

  return (
    <PageContainer contextArea={filtersBar} rawLayout={true}>
      <div className="flex gap-6">
        {/* Audit Table */}
        <div className="flex-1 min-w-0">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.content.map((log) => (
                  <TableRow
                    key={log.id}
                    className={`cursor-pointer ${selectedLogId === log.id ? 'bg-[#F5F5F5]' : ''}`}
                    onClick={() => setSelectedLogId(log.id)}
                  >
                    <TableCell className="whitespace-nowrap text-[#666666]">
                      {formatShortTime(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{log.username}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.role === 'HOD' ? 'info' : log.role === 'STAFF' ? 'default' : 'warning'}>
                        {log.role || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-[#666666]">{log.module}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{actionLabel(log.action)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'SUCCESS' ? 'success' : log.status === 'FAILED' ? 'error' : 'warning'}>
                        {log.status || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#9A9A9A] font-mono text-xs">
                      {log.ip_address}
                    </TableCell>
                  </TableRow>
                ))}

                {data?.content.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Shield className="w-8 h-8 text-[#D4D4D4]" />
                        <span className="text-sm text-[#666666]">No audit logs found</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#F5F5F5]">
                <span className="text-xs text-[#9A9A9A]">
                  Showing {data.number * data.size + 1}–{Math.min((data.number + 1) * data.size, data.totalElements)} of {data.totalElements}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost" size="sm"
                    disabled={data.number === 0}
                    onClick={() => setFilters({ ...filters, page: (filters.page || 0) - 1 })}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: Math.min(data.totalPages, 5) }, (_, i) => (
                    <Button
                      key={i}
                      variant={i === data.number ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, page: i })}
                      className="w-8 h-8 p-0"
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    variant="ghost" size="sm"
                    disabled={data.number >= data.totalPages - 1}
                    onClick={() => setFilters({ ...filters, page: (filters.page || 0) + 1 })}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Detail Side Panel */}
        {detailLog && (
          <div className="hidden lg:block w-[400px] flex-shrink-0">
            <Card className="sticky top-4">
              <div className="px-6 py-4 border-b border-[#F5F5F5] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#111111]">Audit Detail</h3>
                <button
                  onClick={() => setSelectedLogId(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] text-[#9A9A9A] hover:text-[#111111] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <CardContent className="p-6 space-y-5">
                {/* Action header */}
                <div>
                  <h4 className="text-base font-semibold text-[#111111] mb-2">{actionLabel(detailLog.action)}</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant={detailLog.status === 'SUCCESS' ? 'success' : 'error'}>{detailLog.status}</Badge>
                    <Badge variant="outline">{detailLog.module}</Badge>
                  </div>
                </div>

                {detailLog.description && (
                  <div>
                    <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Description</label>
                    <p className="text-[13px] text-[#666666] mt-1 leading-relaxed">{detailLog.description}</p>
                  </div>
                )}

                {detailLog.reason && (
                  <div>
                    <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Reason</label>
                    <p className="text-[13px] text-[#666666] mt-1">{detailLog.reason}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Performed By</label>
                    <p className="text-sm text-[#111111] mt-1">{detailLog.username}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Role</label>
                    <p className="text-sm text-[#111111] mt-1">{detailLog.role || '—'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Timestamp</label>
                    <p className="text-sm text-[#111111] mt-1">{formatTimestamp(detailLog.timestamp)}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Affected Module</label>
                    <p className="text-sm text-[#111111] mt-1">{detailLog.module}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">IP Address</label>
                    <p className="text-sm text-[#111111] mt-1 font-mono text-xs">{detailLog.ip_address}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Browser</label>
                    <p className="text-sm text-[#111111] mt-1">{detailLog.browser || '—'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Device</label>
                    <p className="text-sm text-[#111111] mt-1">{detailLog.device || '—'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Location</label>
                    <p className="text-sm text-[#111111] mt-1">{detailLog.location || '—'}</p>
                  </div>
                </div>

                {/* Before / After Values */}
                {(detailLog.old_value || detailLog.new_value) && (
                  <div className="space-y-3 pt-2 border-t border-[#F5F5F5]">
                    {detailLog.old_value && (
                      <div>
                        <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Before Value</label>
                        <pre className="text-xs text-[#666666] mt-1 p-3 bg-[#FAFAFA] rounded-[10px] border border-[#E8E8E8] overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(parseJson(detailLog.old_value), null, 2) || detailLog.old_value}
                        </pre>
                      </div>
                    )}
                    {detailLog.new_value && (
                      <div>
                        <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">After Value</label>
                        <pre className="text-xs text-[#666666] mt-1 p-3 bg-[#FAFAFA] rounded-[10px] border border-[#E8E8E8] overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(parseJson(detailLog.new_value), null, 2) || detailLog.new_value}
                        </pre>
                      </div>
                    )}
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
