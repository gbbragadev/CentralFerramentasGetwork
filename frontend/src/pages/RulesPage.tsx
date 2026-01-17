import { useState, useEffect } from 'react';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { apiClient } from '@/api/client';
import { Rule, Tenant } from '@/api/types';
import { Plus, Edit, Trash2, FileText, AlertTriangle, MessageSquare, Zap, Info } from 'lucide-react';
import { toast } from 'sonner';

export function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [filterTenantId, setFilterTenantId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    tenantId: '',
    name: '',
    enabled: true,
    providerType: 'MOCK_WHATSAPP' as 'MOCK_WHATSAPP' | 'META_WHATSAPP',
    pollStrategy: 'POLL_ENDPOINT' as 'POLL_ENDPOINT' | 'DEMO_FAKE',
    seniorEndpointPath: '',
    messageTemplate: '',
    recipientStrategy: '',
  });

  const loadTenants = async () => {
    const response = await apiClient.get<Tenant[]>('/tenants?page=1&pageSize=100');
    if (response.data) {
      setTenants(response.data);
    }
  };

  const loadRules = async () => {
    setLoading(true);
    const query = filterTenantId ? `?tenantId=${filterTenantId}&page=1&pageSize=50` : '?page=1&pageSize=50';
    const response = await apiClient.get<Rule[]>(`/rules${query}`);
    if (response.data) {
      setRules(response.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTenants();
    loadRules();
  }, [filterTenantId]);

  const handleCreate = () => {
    setSelectedRule(null);
    setFormData({
      tenantId: filterTenantId || '',
      name: '',
      enabled: true,
      providerType: 'MOCK_WHATSAPP',
      pollStrategy: 'POLL_ENDPOINT',
      seniorEndpointPath: '',
      messageTemplate: '',
      recipientStrategy: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (rule: Rule) => {
    setSelectedRule(rule);
    setFormData({
      tenantId: rule.tenantId,
      name: rule.name,
      enabled: rule.enabled,
      providerType: rule.providerType,
      pollStrategy: rule.pollStrategy,
      seniorEndpointPath: rule.seniorEndpointPath,
      messageTemplate: rule.messageTemplate,
      recipientStrategy: rule.recipientStrategy,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (rule: Rule) => {
    setSelectedRule(rule);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRule) return;

    setSubmitting(true);
    const response = await apiClient.delete(`/rules/${selectedRule.id}`);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Regra excluída com sucesso');
      setIsDeleteModalOpen(false);
      loadRules();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tenantId) {
      toast.error('Selecione um tenant');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('O nome é obrigatório');
      return;
    }

    setSubmitting(true);
    const response = selectedRule
      ? await apiClient.put(`/rules/${selectedRule.id}`, formData)
      : await apiClient.post('/rules', formData);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success(selectedRule ? 'Regra atualizada' : 'Regra criada');
      setIsModalOpen(false);
      loadRules();
    }
  };

  const columns = [
    {
      header: 'Regra',
      accessor: (row: Rule) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-slate-900">{row.name}</div>
            <div className="text-xs text-slate-500">
              {tenants.find((t) => t.id === row.tenantId)?.name || 'Tenant desconhecido'}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Rule) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
            row.enabled
              ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
              : 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/20'
          }`}
        >
          {row.enabled ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      header: 'Provider',
      accessor: (row: Rule) => (
        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
          row.providerType === 'MOCK_WHATSAPP' 
            ? 'bg-orange-50 text-orange-700' 
            : 'bg-green-50 text-green-700'
        }`}>
          <MessageSquare className="h-3 w-3 mr-1" />
          {row.providerType === 'MOCK_WHATSAPP' ? 'Mock' : 'Meta'}
        </span>
      ),
    },
    {
      header: 'Estratégia',
      accessor: (row: Rule) => (
        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
          row.pollStrategy === 'POLL_ENDPOINT' 
            ? 'bg-blue-50 text-blue-700' 
            : 'bg-purple-50 text-purple-700'
        }`}>
          <Zap className="h-3 w-3 mr-1" />
          {row.pollStrategy === 'POLL_ENDPOINT' ? 'Polling' : 'Demo'}
        </span>
      ),
    },
    {
      header: 'Ações',
      accessor: (row: Rule) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)} title="Editar regra">
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDeleteClick(row)} title="Excluir regra">
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Regras">
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 items-center">
              <div className="min-w-[200px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">Filtrar por Tenant</label>
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
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra
            </Button>
          </div>
        </div>

        {/* Table */}
        <Table 
          columns={columns} 
          data={rules} 
          loading={loading}
          emptyMessage="Nenhuma regra cadastrada"
          emptyAction={
            <Button onClick={handleCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira regra
            </Button>
          }
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedRule ? 'Editar Regra' : 'Nova Regra'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tenant Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tenant</label>
            <select
              value={formData.tenantId}
              onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              required
            >
              <option value="">Selecione um tenant</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Nome da Regra"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Notificar documentos pendentes"
            required
          />

          {/* Provider and Strategy */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
              <select
                value={formData.providerType}
                onChange={(e) => setFormData({ ...formData, providerType: e.target.value as 'MOCK_WHATSAPP' | 'META_WHATSAPP' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="MOCK_WHATSAPP">Mock WhatsApp</option>
                <option value="META_WHATSAPP">Meta WhatsApp</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estratégia</label>
              <select
                value={formData.pollStrategy}
                onChange={(e) => setFormData({ ...formData, pollStrategy: e.target.value as 'POLL_ENDPOINT' | 'DEMO_FAKE' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="POLL_ENDPOINT">Polling de Endpoint</option>
                <option value="DEMO_FAKE">Dados Demo</option>
              </select>
            </div>
          </div>

          {/* Senior Endpoint */}
          <div className="space-y-1">
            <Input
              label="Endpoint Senior X"
              value={formData.seniorEndpointPath}
              onChange={(e) => setFormData({ ...formData, seniorEndpointPath: e.target.value })}
              placeholder="/platform/ecm_ged/queries/listEnvelopes"
              required
            />
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Caminho do endpoint na API Senior X para buscar dados
            </p>
          </div>

          {/* Message Template */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Template da Mensagem</label>
            <textarea
              value={formData.messageTemplate}
              onChange={(e) => setFormData({ ...formData, messageTemplate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              rows={4}
              placeholder="Olá {{nome}}, você tem um documento pendente: {{documento}}"
              required
            />
            <p className="text-xs text-slate-500">
              Use {"{{campo}}"} para variáveis dinâmicas
            </p>
          </div>

          {/* Recipient Strategy */}
          <div className="space-y-1">
            <Input
              label="Estratégia de Destinatário"
              value={formData.recipientStrategy}
              onChange={(e) => setFormData({ ...formData, recipientStrategy: e.target.value })}
              placeholder="signers[0].phone"
              required
            />
            <p className="text-xs text-slate-500">
              Campo ou expressão para extrair o telefone do destinatário
            </p>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
            />
            <label htmlFor="enabled" className="text-sm text-slate-700">
              Regra ativa
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {selectedRule ? 'Salvar Alterações' : 'Criar Regra'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-slate-900 font-medium">
                Excluir regra "{selectedRule?.name}"?
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Esta ação não pode ser desfeita. Todas as mensagens e logs associados a esta regra serão mantidos.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteConfirm}
              loading={submitting}
            >
              Excluir Regra
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
