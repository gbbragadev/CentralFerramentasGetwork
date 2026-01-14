import { useState, useEffect } from 'react';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { apiClient } from '@/api/client';
import { Tenant, SeniorCredentials } from '@/api/types';
import { Plus, Edit, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';

export function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', active: true });
  const [credentialsData, setCredentialsData] = useState({
    baseUrl: '',
    authToken: '',
    demoMode: false,
  });

  const loadTenants = async () => {
    setLoading(true);
    const response = await apiClient.get<Tenant[]>('/tenants?page=1&pageSize=50');
    if (response.data) {
      setTenants(response.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleCreate = () => {
    setSelectedTenant(null);
    setFormData({ name: '', slug: '', active: true });
    setIsModalOpen(true);
  };

  const handleEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({ name: tenant.name, slug: tenant.slug, active: tenant.active });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este tenant?')) return;

    const response = await apiClient.delete(`/tenants/${id}`);
    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Tenant excluído com sucesso');
      loadTenants();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = selectedTenant
      ? await apiClient.put(`/tenants/${selectedTenant.id}`, formData)
      : await apiClient.post('/tenants', formData);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success(selectedTenant ? 'Tenant atualizado' : 'Tenant criado');
      setIsModalOpen(false);
      loadTenants();
    }
  };

  const handleCredentials = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    const response = await apiClient.get<SeniorCredentials>(`/tenants/${tenant.id}/senior-credentials`);
    
    if (response.data) {
      setCredentialsData({
        baseUrl: response.data.baseUrl,
        authToken: response.data.authToken,
        demoMode: response.data.demoMode,
      });
    } else {
      setCredentialsData({ baseUrl: '', authToken: '', demoMode: false });
    }
    
    setIsCredentialsModalOpen(true);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    const response = await apiClient.post(
      `/tenants/${selectedTenant.id}/senior-credentials`,
      credentialsData
    );

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Credenciais atualizadas');
      setIsCredentialsModalOpen(false);
    }
  };

  const columns = [
    { header: 'Nome', accessor: 'name' as keyof Tenant },
    { header: 'Slug', accessor: 'slug' as keyof Tenant },
    {
      header: 'Status',
      accessor: (row: Tenant) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            row.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {row.active ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      header: 'Ações',
      accessor: (row: Tenant) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleCredentials(row)}>
            <Settings className="h-4 w-4" />
          </Button>
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
    <AppLayout title="Tenants">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-slate-600">Gerencie os tenants do sistema</p>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Tenant
          </Button>
        </div>

        <Table columns={columns} data={tenants} loading={loading} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedTenant ? 'Editar Tenant' : 'Novo Tenant'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            required
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
            />
            <label htmlFor="active" className="text-sm text-slate-700">Ativo</label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isCredentialsModalOpen}
        onClose={() => setIsCredentialsModalOpen(false)}
        title="Credenciais Senior"
      >
        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
          <Input
            label="Base URL"
            type="url"
            value={credentialsData.baseUrl}
            onChange={(e) => setCredentialsData({ ...credentialsData, baseUrl: e.target.value })}
            placeholder="https://api.senior.com.br"
            required
          />
          <Input
            label="Auth Token"
            value={credentialsData.authToken}
            onChange={(e) => setCredentialsData({ ...credentialsData, authToken: e.target.value })}
            required
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="demoMode"
              checked={credentialsData.demoMode}
              onChange={(e) => setCredentialsData({ ...credentialsData, demoMode: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
            />
            <label htmlFor="demoMode" className="text-sm text-slate-700">Modo Demo</label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsCredentialsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
