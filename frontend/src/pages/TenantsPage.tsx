import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { apiClient } from '@/api/client';
import { Tenant } from '@/api/types';
import { Plus, Edit, Trash2, Settings, Building2, AlertTriangle, Package } from 'lucide-react';
import { toast } from 'sonner';

// Função para gerar slug a partir do nome
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-'); // Remove hífens duplicados
}

export function TenantsPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', active: true });
  const [domainManuallyEdited, setDomainManuallyEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  // Atualiza o domain automaticamente quando o nome muda (se não foi editado manualmente)
  const handleNameChange = useCallback((name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: domainManuallyEdited ? prev.slug : generateSlug(name)
    }));
  }, [domainManuallyEdited]);

  const handleSlugChange = (slug: string) => {
    setDomainManuallyEdited(true);
    setFormData(prev => ({ ...prev, slug }));
  };

  const handleCreate = () => {
    setSelectedTenant(null);
    setFormData({ name: '', slug: '', active: true });
    setDomainManuallyEdited(false);
    setIsModalOpen(true);
  };

  const handleEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({ name: tenant.name, slug: tenant.slug || tenant.domain || '', active: tenant.active ?? tenant.isActive ?? true });
    setDomainManuallyEdited(true); // Ao editar, considera que o domain já foi definido
    setIsModalOpen(true);
  };

  const handleDeleteClick = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTenant) return;

    setSubmitting(true);
    const response = await apiClient.delete(`/tenants/${selectedTenant.id}`);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Tenant excluído com sucesso');
      setIsDeleteModalOpen(false);
      loadTenants();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.name.trim()) {
      toast.error('O nome é obrigatório');
      return;
    }

    if (!formData.slug.trim()) {
      toast.error('O identificador (slug) é obrigatório');
      return;
    }

    // Valida formato do slug
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(formData.slug)) {
      toast.error('O identificador deve conter apenas letras minúsculas, números e hífens');
      return;
    }

    setSubmitting(true);
    const response = selectedTenant
      ? await apiClient.put(`/tenants/${selectedTenant.id}`, formData)
      : await apiClient.post('/tenants', formData);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success(selectedTenant ? 'Tenant atualizado' : 'Tenant criado');
      setIsModalOpen(false);
      loadTenants();
    }
  };

  const columns = [
    { 
      header: 'Nome', 
      accessor: (row: Tenant) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <div className="font-medium text-slate-900">{row.name}</div>
            <div className="text-xs text-slate-500">{row.slug || row.domain}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Tenant) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
            (row.active ?? row.isActive) 
              ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' 
              : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
          }`}
        >
          {(row.active ?? row.isActive) ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      header: 'Ações',
      accessor: (row: Tenant) => (
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => navigate(`/tenants/${row.id}/products`)}
            title="Gerenciar produtos"
          >
            <Package className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => navigate(`/tenants/${row.id}`)}
            title="Configurações do tenant"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => handleEdit(row)}
            title="Editar tenant"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => handleDeleteClick(row)}
            title="Excluir tenant"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Tenants">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-slate-600">Gerencie os clientes cadastrados no sistema.</p>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Tenant
          </Button>
        </div>

        <Table
          columns={columns}
          data={tenants}
          loading={loading}
          emptyMessage="Nenhum tenant cadastrado"
          emptyAction={
            <Button onClick={handleCreate} variant="secondary">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro tenant
            </Button>
          }
        />
      </div>

      {/* Modal de Criação/Edição */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedTenant ? 'Editar Tenant' : 'Novo Tenant'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome da Empresa"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ex: Empresa ABC Ltda"
            required
          />
          <div>
            <Input
              label="Identificador (Domain)"
value={formData.slug}
            onChange={(e) => handleSlugChange(e.target.value.toLowerCase())}
              placeholder="empresa-abc"
              hint="Identificador único usado em URLs e integrações. Gerado automaticamente a partir do nome."
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700">
              Tenant ativo
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {selectedTenant ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
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
                Excluir tenant "{selectedTenant?.name}"?
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Esta ação não pode ser desfeita. Todos os dados associados serão removidos.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={handleDeleteConfirm} loading={submitting}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
