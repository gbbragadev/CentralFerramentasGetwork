import { useState, useEffect } from 'react';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { apiClient } from '@/api/client';
import { OutboxMessage, Tenant, statusColors, statusLabels } from '@/api/types';
import { Eye, RefreshCw, Phone, MessageSquare, Clock, AlertCircle, CheckCircle2, Send, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [submitting, setSubmitting] = useState(false);
  const [metaExpanded, setMetaExpanded] = useState(false);

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
    setMetaExpanded(false);
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

    const body: Record<string, string> = { status: statusToSimulate };
    if (statusToSimulate === 'failed' && errorMessage) {
      body.error = errorMessage;
    }

    setSubmitting(true);
    const response = await apiClient.post(`/mock/outbox/${selectedMessage.id}/status`, body);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Status simulado com sucesso');
      setIsStatusModalOpen(false);
      loadMessages();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'queued':
        return <Clock className="h-4 w-4" />;
      case 'sent':
        return <Send className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'read':
        return <Eye className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatPhone = (phone: string) => {
    // Format Brazilian phone numbers
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
      return `+55 (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  const columns = [
    {
      header: 'Data',
      accessor: (row: OutboxMessage) => (
        <div className="text-sm">
          <div className="font-medium text-slate-900">
            {new Date(row.createdAt).toLocaleDateString('pt-BR')}
          </div>
          <div className="text-slate-500 text-xs">
            {new Date(row.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      header: 'Destinatário',
      accessor: (row: OutboxMessage) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
            <Phone className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <div className="font-medium text-slate-900 text-sm">{formatPhone(row.recipientPhone)}</div>
            <div className="text-xs text-slate-500">
              {row.recipientName || tenants.find((t) => t.id === row.tenantId)?.name || 'Tenant desconhecido'}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row: OutboxMessage) => {
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
      header: 'Provider',
      accessor: (row: OutboxMessage) => (
        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
          row.provider === 'mock' 
            ? 'bg-orange-50 text-orange-700' 
            : 'bg-green-50 text-green-700'
        }`}>
          <MessageSquare className="h-3 w-3 mr-1" />
          {row.provider === 'mock' ? 'Mock' : 'Meta'}
        </span>
      ),
    },
    {
      header: 'Ações',
      accessor: (row: OutboxMessage) => (
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => handleViewDetail(row)}
            title="Ver detalhes"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {row.provider === 'mock' && row.status !== 'failed' && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => handleSimulateStatus(row)} 
              title="Simular mudança de status"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Mensagens">
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Tenant</label>
              <select
                value={filterTenantId}
                onChange={(e) => setFilterTenantId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="">Todos</option>
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="">Todos</option>
                <option value="pending">Pendente</option>
                <option value="queued">Na fila</option>
                <option value="sent">Enviado</option>
                <option value="delivered">Entregue</option>
                <option value="read">Lido</option>
                <option value="failed">Falhou</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="secondary" onClick={loadMessages}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={messages}
          loading={loading}
          emptyMessage="Nenhuma mensagem encontrada"
        />
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Detalhes da Mensagem"
        size="lg"
      >
        {selectedMessage && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500">Destinatário</label>
                <p className="text-sm font-medium text-slate-900">{formatPhone(selectedMessage.recipientPhone)}</p>
                {selectedMessage.recipientName && (
                  <p className="text-xs text-slate-500">{selectedMessage.recipientName}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[selectedMessage.status]?.bg} ${statusColors[selectedMessage.status]?.text}`}>
                    {getStatusIcon(selectedMessage.status)}
                    {statusLabels[selectedMessage.status]}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500">Mensagem</label>
              <div className="mt-1 p-3 bg-slate-50 rounded-lg text-sm whitespace-pre-wrap">
                {selectedMessage.messageContent || 'Sem conteúdo'}
              </div>
            </div>

            {selectedMessage.errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <label className="text-xs font-medium text-red-700">Erro</label>
                <p className="text-sm text-red-600 mt-1">{selectedMessage.errorMessage}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t pt-4">
              <button
                onClick={() => setMetaExpanded(!metaExpanded)}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                {metaExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Metadados
              </button>
              {metaExpanded && (
                <pre className="mt-2 p-3 bg-slate-100 rounded-lg text-xs overflow-auto max-h-48">
                  {JSON.stringify({
                    id: selectedMessage.id,
                    jobId: selectedMessage.jobId,
                    templateName: selectedMessage.templateName,
                    templateParams: selectedMessage.templateParams,
                    seniorDocumentId: selectedMessage.seniorDocumentId,
                    seniorEnvelopeId: selectedMessage.seniorEnvelopeId,
                    externalMessageId: selectedMessage.externalMessageId,
                    idempotencyKey: selectedMessage.idempotencyKey,
                    queuedAt: selectedMessage.queuedAt,
                    sentAt: selectedMessage.sentAt,
                    deliveredAt: selectedMessage.deliveredAt,
                    readAt: selectedMessage.readAt,
                    failedAt: selectedMessage.failedAt,
                  }, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Status Simulation Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Simular Status (Mock)"
      >
        <form onSubmit={handleSubmitStatus} className="space-y-4">
          <p className="text-sm text-slate-600">
            Simule uma mudança de status para esta mensagem. Isso só funciona para mensagens enviadas via Mock.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Novo Status</label>
            <div className="space-y-2">
              {(['delivered', 'read', 'failed'] as const).map((status) => (
                <label key={status} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    checked={statusToSimulate === status}
                    onChange={() => setStatusToSimulate(status)}
                    className="h-4 w-4 text-primary focus:ring-primary border-slate-300"
                  />
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[status]?.bg} ${statusColors[status]?.text}`}>
                    {getStatusIcon(status)}
                    {statusLabels[status]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {statusToSimulate === 'failed' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mensagem de Erro</label>
              <input
                type="text"
                value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
                placeholder="Ex: Número inválido"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsStatusModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              Simular
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
