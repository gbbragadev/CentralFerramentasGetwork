import { useState, useEffect } from 'react';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { apiClient } from '@/api/client';
import { Rule, Tenant } from '@/api/types';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [filterTenantId, setFilterTenantId] = useState('');
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
      tenantId: '',
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

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) return;

    const response = await apiClient.delete(`/rules/${id}`);
    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Regra excluída com sucesso');
      loadRules();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = selectedRule
      ? await apiClient.put(`/rules/${selectedRule.id}`, formData)
      : await apiClient.post('/rules', formData);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success(selectedRule ? 'Regra atualizada' : 'Regra criada');
      setIsModalOpen(false);
      loadRules();
    }
  };

  const columns = [
    { header: 'Nome', accessor: 'name' as keyof Rule },
    {
      header: 'Tenant',
      accessor: (row: Rule) => tenants.find((t) => t.id === row.tenantId)?.name || row.tenantId,
    },
    {
      header: 'Status',
      accessor: (row: Rule) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            row.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {row.enabled ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    { header: 'Provider', accessor: 'providerType' as keyof Rule },
    {
      header: 'Ações',
      accessor: (row: Rule) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)}>
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Regras">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <p className="text-slate-600">Gerencie as regras de notificação</p>
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
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Regra
          </Button>
        </div>

        <Table columns={columns} data={rules} loading={loading} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedRule ? 'Editar Regra' : 'Nova Regra'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tenant</label>
            <select
              value={formData.tenantId}
              onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-md"
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
            label="Nome"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Provider Type</label>
            <select
              value={formData.providerType}
              onChange={(e) => setFormData({ ...formData, providerType: e.target.value as any })}
              className="w-full px-4 py-2 border border-slate-300 rounded-md"
            >
              <option value="MOCK_WHATSAPP">MOCK_WHATSAPP</option>
              <option value="META_WHATSAPP">META_WHATSAPP</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Poll Strategy</label>
            <select
              value={formData.pollStrategy}
              onChange={(e) => setFormData({ ...formData, pollStrategy: e.target.value as any })}
              className="w-full px-4 py-2 border border-slate-300 rounded-md"
            >
              <option value="POLL_ENDPOINT">POLL_ENDPOINT</option>
              <option value="DEMO_FAKE">DEMO_FAKE</option>
            </select>
          </div>

          <Input
            label="Senior Endpoint Path"
            value={formData.seniorEndpointPath}
            onChange={(e) => setFormData({ ...formData, seniorEndpointPath: e.target.value })}
            placeholder="/api/v1/notifications"
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Message Template</label>
            <textarea
              value={formData.messageTemplate}
              onChange={(e) => setFormData({ ...formData, messageTemplate: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-md"
              rows={4}
              required
            />
          </div>

          <Input
            label="Recipient Strategy"
            value={formData.recipientStrategy}
            onChange={(e) => setFormData({ ...formData, recipientStrategy: e.target.value })}
            required
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
            />
            <label htmlFor="enabled" className="text-sm text-slate-700">Ativo</label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
