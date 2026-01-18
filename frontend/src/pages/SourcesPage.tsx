import { useState, useEffect } from 'react';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { apiClient } from '@/api/client';
import { DataSource, DataSourceModule, DataSourceModulePreset, DataSourcePreset, DataSourceTestResult, Tenant } from '@/api/types';
import { Plus, Edit, Trash2, Database, AlertTriangle, Code, Play, CheckCircle, XCircle, Clock, Sparkles, Copy } from 'lucide-react';
import { toast } from 'sonner';

export function SourcesPage() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [modules, setModules] = useState<DataSourceModulePreset[]>([]);
  const [presets, setPresets] = useState<DataSourcePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<DataSourceTestResult | null>(null);
  const [testTenantId, setTestTenantId] = useState<string>('');
  const [testing, setTesting] = useState(false);
  const [formTestResult, setFormTestResult] = useState<DataSourceTestResult | null>(null);
  const [formTesting, setFormTesting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    module: 'PLATFORM_SIGN' as DataSourceModule,
    apiModule: 'sign',
    apiMethod: 'POST' as 'GET' | 'POST',
    apiEndpoint: 'queries/listEnvelopes',
    apiParams: '{\n  "status": ["PENDING"],\n  "offset": 0,\n  "limit": 50\n}',
    apiHeaders: '{}',
    responseDataPath: 'contents',
    responseMapping: '{}',
    isActive: true,
  });

  const loadData = async () => {
    setLoading(true);

    const [sourcesRes, tenantsRes, presetsRes, modulesRes] = await Promise.all([
      apiClient.get<DataSource[]>('/datasources'),
      apiClient.get<Tenant[]>('/tenants?pageSize=100'),
      apiClient.get<DataSourcePreset[]>('/datasources/presets/list'),
      apiClient.get<DataSourceModulePreset[]>('/datasources/modules'),
    ]);

    if (sourcesRes.data) setSources(sourcesRes.data);
    if (tenantsRes.data) {
      setTenants(tenantsRes.data);
      // Set default tenant for testing
      if (tenantsRes.data.length > 0 && !testTenantId) {
        setTestTenantId(tenantsRes.data[0].id);
      }
    }
    if (presetsRes.data) setPresets(presetsRes.data);
    if (modulesRes.data) setModules(modulesRes.data);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const findModulePreset = (moduleId: DataSourceModule) =>
    modules.find((module) => module.id === moduleId);

  const applyModuleDefaults = (moduleId: DataSourceModule) => {
    const preset = findModulePreset(moduleId);
    if (!preset) return;

    setFormData((prev) => ({
      ...prev,
      module: moduleId,
      name: preset.defaultDataSource.name,
      description: preset.defaultDataSource.description || '',
      apiModule: preset.apiModule,
      apiMethod: preset.defaultDataSource.apiMethod,
      apiEndpoint: preset.defaultDataSource.apiEndpoint,
      apiParams: JSON.stringify(preset.defaultDataSource.apiParams ?? {}, null, 2),
      apiHeaders: JSON.stringify(preset.defaultDataSource.apiHeaders ?? {}, null, 2),
      responseDataPath: preset.defaultDataSource.responseDataPath || '',
    }));
    setFormTestResult(null);
  };

  const handleCreate = () => {
    setSelectedSource(null);
    const defaultModule = modules[0]?.id || 'PLATFORM_SIGN';
    const preset = findModulePreset(defaultModule as DataSourceModule);
    if (preset) {
      setFormData({
        name: preset.defaultDataSource.name,
        description: preset.defaultDataSource.description || '',
        module: preset.id,
        apiModule: preset.apiModule,
        apiMethod: preset.defaultDataSource.apiMethod,
        apiEndpoint: preset.defaultDataSource.apiEndpoint,
        apiParams: JSON.stringify(preset.defaultDataSource.apiParams ?? {}, null, 2),
        apiHeaders: JSON.stringify(preset.defaultDataSource.apiHeaders ?? {}, null, 2),
        responseDataPath: preset.defaultDataSource.responseDataPath || '',
        responseMapping: '{}',
        isActive: true,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        module: 'PLATFORM_SIGN',
        apiModule: 'sign',
        apiMethod: 'POST',
        apiEndpoint: 'queries/listEnvelopes',
        apiParams: '{\n  "status": ["PENDING"],\n  "offset": 0,\n  "limit": 50\n}',
        apiHeaders: '{}',
        responseDataPath: 'contents',
        responseMapping: '{}',
        isActive: true,
      });
    }
    setFormTestResult(null);
    setIsModalOpen(true);
  };

  const handleEdit = (source: DataSource) => {
    setSelectedSource(source);
    const preset = findModulePreset(source.module);
    setFormData({
      name: source.name,
      description: source.description || '',
      module: source.module,
      apiModule: source.apiModule,
      apiMethod: source.apiMethod,
      apiEndpoint: source.apiEndpoint,
      apiParams: source.apiParams ? JSON.stringify(source.apiParams, null, 2) : '{}',
      apiHeaders: source.apiHeaders ? JSON.stringify(source.apiHeaders, null, 2) : '{}',
      responseDataPath: source.responseDataPath || '',
      responseMapping: source.responseMapping ? JSON.stringify(source.responseMapping, null, 2) : '{}',
      isActive: source.isActive,
    });
    setFormTestResult(null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (source: DataSource) => {
    setSelectedSource(source);
    setIsDeleteModalOpen(true);
  };

  const handleTestClick = (source: DataSource) => {
    setSelectedSource(source);
    setTestResult(null);
    setIsTestModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSource) return;

    setSubmitting(true);
    const response = await apiClient.delete(`/datasources/${selectedSource.id}`);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Fonte excluída com sucesso');
      setIsDeleteModalOpen(false);
      loadData();
    }
  };

  const handleTest = async () => {
    if (!selectedSource || !testTenantId) {
      toast.error('Selecione um tenant para testar');
      return;
    }

    setTesting(true);
    setTestResult(null);

    const response = await apiClient.post<DataSourceTestResult>(`/datasources/${selectedSource.id}/test`, {
      tenantId: testTenantId,
    });

    setTesting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else if (response.data) {
      setTestResult(response.data);
      if (response.data.success) {
        toast.success(`Query executada em ${response.data.duration}ms`);
      } else {
        toast.error(`Erro HTTP ${response.data.httpStatus}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!formData.apiEndpoint.trim()) {
      toast.error('Endpoint da API é obrigatório');
      return;
    }

    // Validate JSON fields
    let apiParams = {};
    let apiHeaders = {};
    let responseMapping = {};

    try {
      apiParams = JSON.parse(formData.apiParams);
    } catch {
      toast.error('Parâmetros da API devem ser um JSON válido');
      return;
    }

    try {
      apiHeaders = JSON.parse(formData.apiHeaders);
    } catch {
      toast.error('Headers da API devem ser um JSON válido');
      return;
    }

    try {
      responseMapping = JSON.parse(formData.responseMapping);
    } catch {
      toast.error('Mapeamento de resposta deve ser um JSON válido');
      return;
    }

    setSubmitting(true);

    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      module: formData.module,
      apiModule: formData.apiModule,
      apiMethod: formData.apiMethod,
      apiEndpoint: formData.apiEndpoint,
      apiParams: Object.keys(apiParams).length > 0 ? apiParams : undefined,
      apiHeaders: Object.keys(apiHeaders).length > 0 ? apiHeaders : undefined,
      responseDataPath: formData.responseDataPath || undefined,
      responseMapping: Object.keys(responseMapping).length > 0 ? responseMapping : undefined,
      isActive: formData.isActive,
    };

    const response = selectedSource
      ? await apiClient.put(`/datasources/${selectedSource.id}`, payload)
      : await apiClient.post('/datasources', payload);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success(selectedSource ? 'Fonte atualizada' : 'Fonte criada');
      setIsModalOpen(false);
      loadData();
    }
  };

  const handlePresetSelect = (preset: DataSourcePreset) => {
    setFormData({
      name: preset.name,
      description: preset.description,
      module: preset.module,
      apiModule: preset.apiModule,
      apiMethod: preset.apiMethod as 'GET' | 'POST',
      apiEndpoint: preset.apiEndpoint,
      apiParams: JSON.stringify(preset.apiParams, null, 2),
      apiHeaders: JSON.stringify(preset.apiHeaders ?? {}, null, 2),
      responseDataPath: preset.responseDataPath,
      responseMapping: '{}',
      isActive: true,
    });
    setFormTestResult(null);
    setIsPresetsModalOpen(false);
    setIsModalOpen(true);
  };

  const handleCopyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      toast.success('Path copiado');
    } catch {
      toast.error('NÃ£o foi possÃ­vel copiar o path');
    }
  };

  const handleFormTest = async () => {
    if (!testTenantId) {
      toast.error('Selecione um tenant para testar');
      return;
    }

    let apiParams = {};
    let apiHeaders = {};

    try {
      apiParams = JSON.parse(formData.apiParams);
    } catch {
      toast.error('Parâmetros da API devem ser um JSON válido');
      return;
    }

    try {
      apiHeaders = JSON.parse(formData.apiHeaders);
    } catch {
      toast.error('Headers da API devem ser um JSON válido');
      return;
    }

    setFormTesting(true);
    setFormTestResult(null);

    const response = await apiClient.post<DataSourceTestResult>('/datasources/test', {
      tenantId: testTenantId,
      dataSourceId: selectedSource?.id,
      dataSource: {
        apiModule: formData.apiModule,
        apiMethod: formData.apiMethod,
        apiEndpoint: formData.apiEndpoint,
        apiParams,
        apiHeaders,
        responseDataPath: formData.responseDataPath || undefined,
      },
    });

    setFormTesting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else if (response.data) {
      setFormTestResult(response.data);
      if (response.data.success) {
        toast.success(`Query executada em ${response.data.duration}ms`);
      } else {
        toast.error(`Erro HTTP ${response.data.httpStatus}`);
      }
    }
  };

  const renderTestResult = (result: DataSourceTestResult) => (
    <div className="space-y-4">
      <div className={`rounded-lg p-4 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={`font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
              HTTP {result.httpStatus}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>{result.duration}ms</span>
            {result.recordCount !== null && (
              <span className="font-medium">{result.recordCount} registros</span>
            )}
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-2">RequisiÃ§Ã£o</h4>
        <div className="bg-slate-900 rounded-lg p-3 text-sm">
          <div className="text-green-400 font-mono">
            {result.method} {result.url}
          </div>
          {Object.keys(result.requestBody).length > 0 && (
            <pre className="text-slate-300 mt-2 text-xs overflow-x-auto">
              {JSON.stringify(result.requestBody, null, 2)}
            </pre>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-2">Resposta</h4>
        <div className="bg-slate-900 rounded-lg p-3">
          <pre className="text-slate-300 text-xs overflow-x-auto max-h-64">
            {JSON.stringify(result.response, null, 2)}
          </pre>
        </div>
      </div>

      {result.extractedData && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">Dados ExtraÃ­dos</h4>
          <div className="bg-slate-900 rounded-lg p-3">
            <pre className="text-slate-300 text-xs overflow-x-auto max-h-64">
              {JSON.stringify(result.extractedData, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {result.detectedPaths && result.detectedPaths.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">Paths detectados</h4>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {result.detectedPaths.map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => handleCopyPath(path)}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs hover:bg-slate-200"
                title="Clique para copiar"
              >
                <Copy className="h-3 w-3" />
                {path}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const getStatusBadge = (source: DataSource) => {
    if (!source.lastTestedAt) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          <Clock className="h-3 w-3" />
          Não testado
        </span>
      );
    }
    if (source.lastTestStatus === 'SUCCESS') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle className="h-3 w-3" />
          Sucesso
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <XCircle className="h-3 w-3" />
        Erro
      </span>
    );
  };

  const columns = [
    {
      header: 'Nome',
      accessor: (row: DataSource) => (
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
      header: 'Módulo',
      accessor: (row: DataSource) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          {modules.find((module) => module.id === row.module)?.label || row.module}
        </span>
      ),
    },
    {
      header: 'Endpoint',
      accessor: (row: DataSource) => (
        <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 max-w-[200px] truncate block">
          {row.apiEndpoint}
        </code>
      ),
    },
    {
      header: 'Último Teste',
      accessor: (row: DataSource) => getStatusBadge(row),
    },
    {
      header: 'Regras',
      accessor: (row: DataSource) => (
        <span className="text-sm text-slate-600">
          {row._count?.rules || 0}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: DataSource) => (
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
      accessor: (row: DataSource) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleTestClick(row)}
            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Testar Query"
          >
            <Play className="h-4 w-4" />
          </button>
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
            disabled={row._count && row._count.rules > 0}
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
              Configure fontes de dados reutilizáveis para buscar informações das APIs Senior.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsPresetsModalOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Usar Preset
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Fonte
            </Button>
          </div>
        </div>

        {/* Tabela */}
        <Table
          columns={columns}
          data={sources}
          loading={loading}
          emptyMessage="Nenhuma fonte de dados cadastrada"
          emptyAction={
            <div className="flex gap-2">
              <Button onClick={() => setIsPresetsModalOpen(true)} variant="secondary">
                <Sparkles className="h-4 w-4 mr-2" />
                Usar Preset
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar fonte
              </Button>
            </div>
          }
        />
      </div>

      {/* Modal de Presets */}
      <Modal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        title="Presets de Fontes de Dados"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Selecione um preset para criar rapidamente uma fonte de dados pré-configurada.
          </p>
          <div className="grid gap-3 max-h-[60vh] overflow-y-auto">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className="w-full text-left p-4 border border-slate-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Database className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900">{preset.name}</div>
                    <div className="text-sm text-slate-500 mt-0.5">{preset.description}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        {modules.find((module) => module.id === preset.module)?.label || preset.module}
                      </span>
                      <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                        {preset.apiEndpoint}
                      </code>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Modal de Criação/Edição */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedSource ? 'Editar Fonte de Dados' : 'Nova Fonte de Dados'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome da Fonte *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Envelopes Pendentes de Assinatura"
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
                  value={formData.module}
                  onChange={(e) => applyModuleDefaults(e.target.value as DataSourceModule)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  {modules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="API Module"
                value={formData.apiModule}
                onChange={(e) => setFormData({ ...formData, apiModule: e.target.value })}
                placeholder="sign"
                hint="Segmento da API Senior (ex: sign, ecm_ged)"
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Método
                </label>
                <select
                  value={formData.apiMethod}
                  onChange={(e) => setFormData({ ...formData, apiMethod: e.target.value as 'GET' | 'POST' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </select>
              </div>
            </div>

            <Input
              label="Caminho dos Dados"
              value={formData.responseDataPath}
              onChange={(e) => setFormData({ ...formData, responseDataPath: e.target.value })}
              placeholder="contents"
              hint="Campo na resposta com os dados"
            />

            <Input
              label="Endpoint *"
              value={formData.apiEndpoint}
              onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
              placeholder="queries/listEnvelopes"
              hint="Caminho relativo ao módulo (sem barra inicial)"
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Parâmetros do Body/Query (JSON)
              </label>
              <textarea
                value={formData.apiParams}
                onChange={(e) => setFormData({ ...formData, apiParams: e.target.value })}
                rows={5}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono text-sm"
                placeholder='{"status": ["PENDING"], "limit": 50}'
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Headers Adicionais (JSON)
              </label>
              <textarea
                value={formData.apiHeaders}
                onChange={(e) => setFormData({ ...formData, apiHeaders: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono text-sm"
                placeholder='{}'
              />
            </div>
          </div>


          <div className="bg-slate-50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Testar query com tenant
                </label>
                <select
                  value={testTenantId}
                  onChange={(e) => setTestTenantId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="">Selecione um tenant...</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="button" onClick={handleFormTest} loading={formTesting} disabled={!testTenantId}>
                <Play className="h-4 w-4 mr-2" />
                Testar Query
              </Button>
            </div>

            {formTestResult && renderTestResult(formTestResult)}
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

      {/* Modal de Teste */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title={`Testar Query: ${selectedSource?.name || ''}`}
        size="xl"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tenant para teste *
                </label>
                <select
                  value={testTenantId}
                  onChange={(e) => setTestTenantId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="">Selecione um tenant...</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  As credenciais do tenant selecionado serão usadas para autenticar na API Senior.
                </p>
              </div>
              <Button onClick={handleTest} loading={testing} disabled={!testTenantId}>
                <Play className="h-4 w-4 mr-2" />
                Executar
              </Button>
            </div>
          </div>

          {testResult && renderTestResult(testResult)}
        </div>
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
                Esta ação não pode ser desfeita. Regras que usam esta fonte serão desvinculadas.
              </p>
              {selectedSource?._count && selectedSource._count.rules > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                  Esta fonte está sendo usada por {selectedSource._count.rules} regra(s).
                </div>
              )}
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
              disabled={selectedSource?._count && selectedSource._count.rules > 0}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
