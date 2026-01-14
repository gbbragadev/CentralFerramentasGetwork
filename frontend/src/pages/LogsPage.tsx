import { useState, useEffect } from 'react';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { apiClient } from '@/api/client';
import { Log, Tenant } from '@/api/types';
import { Eye } from 'lucide-react';

export function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [filterTenantId, setFilterTenantId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const loadTenants = async () => {
    const response = await apiClient.get<Tenant[]>('/tenants?page=1&pageSize=100');
    if (response.data) {
      setTenants(response.data);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    let query = '?page=1&pageSize=50';
    if (filterTenantId) query += `&tenantId=${filterTenantId}`;
    if (filterStatus) query += `&status=${filterStatus}`;
    
    const response = await apiClient.get<Log[]>(`/logs${query}`);
    if (response.data) {
      setLogs(response.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTenants();
    loadLogs();
  }, [filterTenantId, filterStatus]);

  const handleViewDetail = (log: Log) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const columns = [
    {
      header: 'Data',
      accessor: (row: Log) => new Date(row.createdAt).toLocaleString('pt-BR'),
    },
    {
      header: 'Tenant',
      accessor: (row: Log) => tenants.find((t) => t.id === row.tenantId)?.name || row.tenantId,
    },
    {
      header: 'Status',
      accessor: (row: Log) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            row.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    { header: 'Tentativas', accessor: 'attempts' as keyof Log },
    {
      header: 'Erro',
      accessor: (row: Log) => (
        <span className="text-sm text-slate-600 truncate max-w-xs block">
          {row.error || '-'}
        </span>
      ),
    },
    {
      header: 'Ações',
      accessor: (row: Log) => (
        <Button size="sm" variant="ghost" onClick={() => handleViewDetail(row)}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <AppLayout title="Logs">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <p className="text-slate-600">Logs de execução do sistema</p>
            <select
              value={filterTenantId}
              onChange={(e) => setFilterTenantId(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-md text-sm"
            >
              <option value="">Todos os tenants</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-md text-sm"
            >
              <option value="">Todos os status</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>

        <Table columns={columns} data={logs} loading={loading} />
      </div>

      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Detalhes do Log">
        {selectedLog && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-slate-700">Data</h3>
              <p className="text-slate-900">{new Date(selectedLog.createdAt).toLocaleString('pt-BR')}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-700">Status</h3>
              <p className="text-slate-900">{selectedLog.status}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-700">Tentativas</h3>
              <p className="text-slate-900">{selectedLog.attempts}</p>
            </div>
            {selectedLog.error && (
              <div>
                <h3 className="text-sm font-medium text-slate-700">Erro</h3>
                <p className="text-red-600 whitespace-pre-wrap bg-red-50 p-3 rounded">{selectedLog.error}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Metadados</h3>
              <pre className="text-xs bg-slate-50 p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(selectedLog.meta, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
