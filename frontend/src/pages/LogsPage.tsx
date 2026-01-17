import { useState, useEffect } from 'react';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { apiClient } from '@/api/client';
import { Log, Tenant, statusColors, statusLabels } from '@/api/types';
import { Eye, RefreshCw, FileCheck, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Activity } from 'lucide-react';

export function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [filterTenantId, setFilterTenantId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [metaExpanded, setMetaExpanded] = useState(false);

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
    setMetaExpanded(false);
    setIsDetailModalOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const columns = [
    {
      header: 'Data/Hora',
      accessor: (row: Log) => (
        <div className="text-sm">
          <div className="font-medium text-slate-900">
            {new Date(row.createdAt).toLocaleDateString('pt-BR')}
          </div>
          <div className="text-slate-500 text-xs">
            {new Date(row.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      header: 'Execução',
      accessor: (row: Log) => (
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
            row.status === 'success' ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <FileCheck className={`h-4 w-4 ${
              row.status === 'success' ? 'text-green-600' : 'text-red-600'
            }`} />
          </div>
          <div>
            <div className="font-medium text-slate-900 text-sm">
              {tenants.find((t) => t.id === row.tenantId)?.name || 'Tenant desconhecido'}
            </div>
            <div className="text-xs text-slate-500">
              {row.attempts} tentativa{row.attempts !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Log) => {
        const colors = statusColors[row.status] || { bg: 'bg-slate-50', text: 'text-slate-700', ring: 'ring-slate-600/20' };
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text} ring-1 ring-inset ${colors.ring}`}>
            {getStatusIcon(row.status)}
            {statusLabels[row.status] || row.status}
          </span>
        );
      },
    },
    {
      header: 'Detalhes',
      accessor: (row: Log) => (
        <span className="text-sm text-slate-600 truncate max-w-xs block">
          {row.error ? (
            <span className="text-red-600">{row.error.substring(0, 50)}{row.error.length > 50 ? '...' : ''}</span>
          ) : (
            <span className="text-green-600">Executado com sucesso</span>
          )}
        </span>
      ),
    },
    {
      header: 'Ações',
      accessor: (row: Log) => (
        <Button size="sm" variant="ghost" onClick={() => handleViewDetail(row)} title="Ver detalhes">
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  // Calculate stats
  const successCount = logs.filter(l => l.status === 'success').length;
  const errorCount = logs.filter(l => l.status === 'error').length;

  return (
    <AppLayout title="Logs">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Activity className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{logs.length}</p>
                <p className="text-sm text-slate-500">Total de logs</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{successCount}</p>
                <p className="text-sm text-slate-500">Sucesso</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                <p className="text-sm text-slate-500">Erros</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Tenant</label>
              <select
                value={filterTenantId}
                onChange={(e) => setFilterTenantId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Todos os tenants</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Todos os status</option>
                <option value="success">Sucesso</option>
                <option value="error">Erro</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={loadLogs}
                title="Atualizar lista"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <Table 
          columns={columns} 
          data={logs} 
          loading={loading}
          emptyMessage="Nenhum log encontrado"
        />
      </div>

      {/* Detail Modal */}
      <Modal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        title="Detalhes do Log"
      >
        {selectedLog && (
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full ${
                statusColors[selectedLog.status]?.bg || 'bg-slate-50'
              } ${statusColors[selectedLog.status]?.text || 'text-slate-700'}`}>
                {getStatusIcon(selectedLog.status)}
                {statusLabels[selectedLog.status] || selectedLog.status}
              </span>
              <span className="text-xs text-slate-500">
                {new Date(selectedLog.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4">
              <div>
                <p className="text-xs text-slate-500">Tenant</p>
                <p className="font-medium text-slate-900">
                  {tenants.find((t) => t.id === selectedLog.tenantId)?.name || 'Desconhecido'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Tentativas</p>
                <p className="font-medium text-slate-900">{selectedLog.attempts}</p>
              </div>
            </div>

            {/* Error */}
            {selectedLog.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800">Mensagem de Erro</h3>
                    <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap font-mono">
                      {selectedLog.error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {selectedLog.status === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-sm text-green-700 font-medium">
                    Execução concluída com sucesso
                  </p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div>
              <button
                type="button"
                onClick={() => setMetaExpanded(!metaExpanded)}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                {metaExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Metadados
              </button>
              {metaExpanded && (
                <pre className="mt-2 text-xs bg-slate-50 border border-slate-200 p-3 rounded-lg overflow-auto max-h-64">
                  {JSON.stringify(selectedLog.meta, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
