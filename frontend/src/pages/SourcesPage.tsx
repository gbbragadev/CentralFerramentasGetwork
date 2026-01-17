import { useState, useEffect } from 'react';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { apiClient } from '@/api/client';
import { WhatsAppSource, Tenant, sourceTypeLabels, SourceType } from '@/api/types';
import { Plus, Edit, Trash2, Database, AlertTriangle, Code } from 'lucide-react';
import { toast } from 'sonner';

const SOURCE_TYPE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: 'sign', label: 'Sign - Assinaturas Pendentes' },
  { value: 'ged', label: 'GED - Gestão de Documentos' },
  { value: 'ged_folder', label: 'Pasta Específica do GED' },
  { value: 'admission', label: 'Admissão Digital' },
  { value: 'custom', label: 'Personalizado' },
];

const API_MODULE_OPTIONS = [
  { value: 'sign', label: 'Sign (Assinaturas)' },
  { value: 'ecm_ged', label: 'ECM/GED (Documentos)' },
  { value: 'hcm', label: 'HCM (Recursos Humanos)' },
];

export function SourcesPage() {
  const [sources, setSources] = useState<WhatsAppSource[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<WhatsAppSource | null>(null);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    tenantId: '',
    name: '',
    description: '',
    sourceType: 'sign' as SourceType,
    apiModule: 'sign',
    apiEndpoint: '/sign/queries/listEnvelopes',
    apiMethod: 'POST',
    apiParams: '{\n  "status": ["PENDING_SIGNATURE"],\n  "limit": 100\n}',
    responseDataPath: 'contents',
    isActive: true,
  });

  const loadData = async () => {
    setLoading(true);
    
    const [sourcesRes, tenantsRes] = await Promise.all([
      apiClient.get<WhatsAppSource[]>(`/whatsapp/sources${selectedTenantFilter ? `?tenantId=${selectedTenantFilter}` : ''}`),
      apiClient.get<Tenant[]>('/tenants?pageSize=100'),
    ]);

    if (sourcesRes.data) setSources(sourcesRes.data);
    if (tenantsRes.data) setTenants(tenantsRes.data);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedTenantFilter]);

  const handleCreate = () => {
    setSelectedSource(null);
    setFormData({
      tenantId: selectedTenantFilter || (tenants[0]?.id || ''),
      name: '',
      description: '',
      sourceType: 'sign',
      apiModule: 'sign',
      apiEndpoint: '/sign/queries/listEnvelopes',
      apiMethod: 'POST',
      apiParams: '{\n  "status": ["PENDING_SIGNATURE"],\n  "limit": 100\n}',
      responseDataPath: 'contents',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (source: WhatsAppSource) => {
    setSelectedSource(source);
    setFormData({
      tenantId: source.tenantId,
      name: source.name,
      description: source.description || '',
      sourceType: source.sourceType,
      apiModule: source.apiModule,
      apiEndpoint: source.apiEndpoint,
      apiMethod: source.apiMethod,
      apiParams: JSON.stringify(source.apiParams, null, 2),
      responseDataPath: source.responseDataPath,
      isActive: source.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (source: WhatsAppSource) => {
    setSelectedSource(source);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSource) return;

    setSubmitting(true);
    const response = await apiClient.delete(`/whatsapp/sources/${selectedSource.id}`);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Fonte excluída com sucesso');
      setIsDeleteModalOpen(false);
      loadData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tenantId) {
      toast.error('Selecione um tenant');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!formData.apiEndpoint.trim()) {
      toast.error('Endpoint da API é obrigatório');
      return;
    }

    // Validar JSON
    let apiParams = {};
    try {
      apiParams = JSON.parse(formData.apiParams);
    } catch {
      toast.error('Parâmetros da API devem ser um JSON válido');
      return;
    }

    setSubmitting(true);
    const payload = {
      ...formData,
      apiParams,
    };

    const response = selectedSource
      ? await apiClient.put(`/whatsapp/sources/${selectedSource.id}`, payload)
      : await apiClient.post('/whatsapp/sources', payload);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success(selectedSource ? 'Fonte atualizada' : 'Fonte criada');
      setIsModalOpen(false);
      loadData();
    }
  };

  // Preencher endpoint padrão baseado no tipo
  const handleSourceTypeChange = (type: SourceType) => {
    let apiModule = 'sign';
    let apiEndpoint = '/sign/queries/listEnvelopes';
    let apiParams = '{\n  "status": ["PENDING_SIGNATURE"],\n  "limit": 100\n}';

    switch (type) {
      case 'sign':
        apiModule = 'sign';
        apiEndpoint = '/sign/queries/listEnvelopes';
        apiParams = '{\n  "status": ["PENDING_SIGNATURE"],\n  "limit": 100\n}';
        break;
      case 'ged':
      case 'ged_folder':
        apiModule = 'ecm_ged';
        apiEndpoint = '/ecm_ged/queries/getSignedDocuments';
        apiParams = '{\n  "limit": 100\n}';
        break;
      case 'admission':
        apiModule = 'hcm';
        apiEndpoint = '/hcm/queries/listAdmissions';
        apiParams = '{\n  "status": "PENDING",\n  "limit": 100\n}';
        break;
      case 'custom':
        apiModule = '';
        apiEndpoint = '';
        apiParams = '{}';
        break;
    }

    setFormData(prev => ({
      ...prev,
      sourceType: type,
      apiModule,
      apiEndpoint,
      apiParams,
    }));
  };

  const columns = [
    {
      header: 'Nome',
      accessor: (row: WhatsAppSource) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center">
            <Database className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <div className="font-medium text-slate-900">{row.name}</div>
            <div className="text-xs text-slate-500">{row.description || 'Sem descrição'}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Tipo',
      accessor: (row: WhatsAppSource) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          {sourceTypeLabels[row.sourceType]}
        </span>
      ),
    },
    {
      header: 'Tenant',
      accessor: (row: WhatsAppSource) => (
        <span className="text-sm text-slate-600">
          {row.tenant?.name || tenants.find(t => t.id === row.tenantId)?.name || '-'}
        </span>
      ),
    },
    {
      header: 'Endpoint',
      accessor: (row: WhatsAppSource) => (
        <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
          {row.apiEndpoint}
        </code>
      ),
    },
    {
      header: 'Status',
      accessor: (row: WhatsAppSource) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.isActive 
            ? 'bg-green-100 text-green-700' 
            : 'bg-slate-100 text-slate-500'
        }`}>
          {row.isActive ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      header: 'Ações',
      accessor: (row: WhatsAppSource) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleEdit(row)}
            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteClick(row)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Fontes de Dados">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-slate-600">
              Configure de onde buscar os dados para envio de mensagens WhatsApp.
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Fonte
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-4">
          <select
            value={selectedTenantFilter}
            onChange={(e) => setSelectedTenantFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            <option value="">Todos os tenants</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tabela */}
        <Table
          columns={columns}
          data={sources}
          loading={loading}
          emptyMessage="Nenhuma fonte de dados cadastrada"
          emptyAction={
            <Button onClick={handleCreate} variant="secondary">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira fonte
            </Button>
          }
        />
      </div>

      {/* Modal de Criação/Edição */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedSource ? 'Editar Fonte de Dados' : 'Nova Fonte de Dados'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Tenant *
              </label>
              <select
                value={formData.tenantId}
                onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                required
              >
                <option value="">Selecione...</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Tipo de Fonte *
              </label>
              <select
                value={formData.sourceType}
                onChange={(e) => handleSourceTypeChange(e.target.value as SourceType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                {SOURCE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Nome da Fonte"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Documentos Pendentes de Assinatura"
            required
          />

          <Input
            label="Descrição"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descrição opcional da fonte"
          />

          <div className="bg-slate-50 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Code className="h-4 w-4" />
              Configuração da API
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Módulo
                </label>
                <select
                  value={formData.apiModule}
                  onChange={(e) => setFormData({ ...formData, apiModule: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  {API_MODULE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Método
                </label>
                <select
                  value={formData.apiMethod}
                  onChange={(e) => setFormData({ ...formData, apiMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </select>
              </div>

              <Input
                label="Caminho dos Dados"
                value={formData.responseDataPath}
                onChange={(e) => setFormData({ ...formData, responseDataPath: e.target.value })}
                placeholder="contents"
                hint="Campo na resposta com os dados"
              />
            </div>

            <Input
              label="Endpoint"
              value={formData.apiEndpoint}
              onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
              placeholder="/sign/queries/listEnvelopes"
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Parâmetros (JSON)
              </label>
              <textarea
                value={formData.apiParams}
                onChange={(e) => setFormData({ ...formData, apiParams: e.target.value })}
                rows={5}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono text-sm"
                placeholder='{"status": ["PENDING_SIGNATURE"]}'
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700">
              Fonte ativa
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {selectedSource ? 'Salvar Alterações' : 'Criar Fonte'}
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
                Excluir fonte "{selectedSource?.name}"?
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Esta ação não pode ser desfeita. Jobs que usam esta fonte serão afetados.
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
