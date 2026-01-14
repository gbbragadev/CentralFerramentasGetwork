import { useState, useEffect } from 'react';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { apiClient } from '@/api/client';
import { OutboxMessage, Tenant } from '@/api/types';
import { Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function OutboxPage() {
  const [messages, setMessages] = useState<OutboxMessage[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<OutboxMessage | null>(null);
  const [filterTenantId, setFilterTenantId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [statusToSimulate, setStatusToSimulate] = useState<'delivered' | 'read' | 'failed'>('delivered');
  const [errorMessage, setErrorMessage] = useState('');

  const loadTenants = async () => {
    const response = await apiClient.get<Tenant[]>('/tenants?page=1&pageSize=100');
    if (response.data) {
      setTenants(response.data);
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    let query = '?page=1&pageSize=50';
    if (filterTenantId) query += `&tenantId=${filterTenantId}`;
    if (filterStatus) query += `&status=${filterStatus}`;
    
    const response = await apiClient.get<OutboxMessage[]>(`/outbox${query}`);
    if (response.data) {
      setMessages(response.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTenants();
    loadMessages();
  }, [filterTenantId, filterStatus]);

  const handleViewDetail = (message: OutboxMessage) => {
    setSelectedMessage(message);
    setIsDetailModalOpen(true);
  };

  const handleSimulateStatus = (message: OutboxMessage) => {
    setSelectedMessage(message);
    setStatusToSimulate('delivered');
    setErrorMessage('');
    setIsStatusModalOpen(true);
  };

  const handleSubmitStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage) return;

    const body: any = { status: statusToSimulate };
    if (statusToSimulate === 'failed' && errorMessage) {
      body.error = errorMessage;
    }

    const response = await apiClient.post(`/mock/outbox/${selectedMessage.id}/status`, body);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Status simulado com sucesso');
      setIsStatusModalOpen(false);
      loadMessages();
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    sent: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    read: 'bg-purple-100 text-purple-800',
    failed: 'bg-red-100 text-red-800',
  };

  const columns = [
    {
      header: 'Data',
      accessor: (row: OutboxMessage) => new Date(row.createdAt).toLocaleString('pt-BR'),
    },
    {
      header: 'Tenant',
      accessor: (row: OutboxMessage) => tenants.find((t) => t.id === row.tenantId)?.name || row.tenantId,
    },
    { header: 'Para', accessor: 'to' as keyof OutboxMessage },
    {
      header: 'Status',
      accessor: (row: OutboxMessage) => (
        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[row.status] || 'bg-slate-100 text-slate-800'}`}>
          {row.status}
        </span>
      ),
    },
    { header: 'Provider', accessor: 'providerType' as keyof OutboxMessage },
    {
      header: 'Ações',
      accessor: (row: OutboxMessage) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleViewDetail(row)}>
            <Eye className="h-4 w-4" />
          </Button>
          {row.providerType === 'MOCK_WHATSAPP' && (
            <Button size="sm" variant="ghost" onClick={() => handleSimulateStatus(row)} title="Simular status">
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Mensagens (Outbox)">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <p className="text-slate-600">Mensagens enviadas pelo sistema</p>
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
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="read">Read</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <Table columns={columns} data={messages} loading={loading} />
      </div>

      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Detalhes da Mensagem">
        {selectedMessage && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-slate-700">Para</h3>
              <p className="text-slate-900">{selectedMessage.to}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-700">Texto</h3>
              <p className="text-slate-900 whitespace-pre-wrap bg-slate-50 p-3 rounded">{selectedMessage.text}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-700">Status</h3>
              <p className="text-slate-900">{selectedMessage.status}</p>
            </div>
            {selectedMessage.error && (
              <div>
                <h3 className="text-sm font-medium text-slate-700">Erro</h3>
                <p className="text-red-600">{selectedMessage.error}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Metadados</h3>
              <pre className="text-xs bg-slate-50 p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(selectedMessage.meta, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="Simular Status">
        <form onSubmit={handleSubmitStatus} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Novo Status</label>
            <select
              value={statusToSimulate}
              onChange={(e) => setStatusToSimulate(e.target.value as any)}
              className="w-full px-4 py-2 border border-slate-300 rounded-md"
            >
              <option value="delivered">Delivered</option>
              <option value="read">Read</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {statusToSimulate === 'failed' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Mensagem de Erro</label>
              <textarea
                value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-md"
                rows={3}
                placeholder="Descreva o erro (opcional)"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsStatusModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Simular</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
