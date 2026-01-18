import { useState, useEffect } from 'react';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { apiClient } from '@/api/client';
import { MessageTemplate, MessageTemplatePreview, MessageTemplatePreset, DataSource, DataSourceTestResult, DataSourceModulePreset, Tenant } from '@/api/types';
import { Plus, Edit, Trash2, AlertTriangle, Eye, Database, MessageSquare, Play, Copy, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [dataSourceModules, setDataSourceModules] = useState<DataSourceModulePreset[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [templatePresets, setTemplatePresets] = useState<MessageTemplatePreset[]>([]);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
  const [dataSourceTestResult, setDataSourceTestResult] = useState<DataSourceTestResult | null>(null);
  const [dataSourceTesting, setDataSourceTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewData, setPreviewData] = useState<MessageTemplatePreview | null>(null);
  const [previewTenantId, setPreviewTenantId] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dataSourceId: '' as string | null,
    messageBody: '',
    isActive: true,
  });

  const loadData = async () => {
    setLoading(true);

    const [templatesRes, dataSourcesRes, tenantsRes, presetsRes, modulesRes] = await Promise.all([
      apiClient.get<MessageTemplate[]>('/templates'),
      apiClient.get<DataSource[]>('/datasources'),
      apiClient.get<Tenant[]>('/tenants?pageSize=100'),
      apiClient.get<MessageTemplatePreset[]>('/templates/presets'),
      apiClient.get<DataSourceModulePreset[]>('/datasources/modules'),
    ]);

    if (templatesRes.data) setTemplates(templatesRes.data);
    if (dataSourcesRes.data) setDataSources(dataSourcesRes.data);
    if (tenantsRes.data) {
      setTenants(tenantsRes.data);
      if (tenantsRes.data.length > 0 && !previewTenantId) {
        setPreviewTenantId(tenantsRes.data[0].id);
      }
    }
    if (presetsRes.data) setTemplatePresets(presetsRes.data);
    if (modulesRes.data) setDataSourceModules(modulesRes.data);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDataSourceChange = (dataSourceId: string | null) => {
    const dataSource = dataSources.find((ds) => ds.id === dataSourceId) || null;
    setSelectedDataSource(dataSource);
    setDataSourceTestResult(null);
    setFormData((prev) => ({ ...prev, dataSourceId: dataSource ? dataSource.id : null }));
  };

  const applyTemplatePreset = (preset: MessageTemplatePreset) => {
    setFormData((prev) => ({
      ...prev,
      messageBody: preset.messageBody,
    }));
  };

  const handleDataSourceTest = async () => {
    if (!formData.dataSourceId || !previewTenantId) {
      toast.error('Selecione um tenant e uma fonte de dados');
      return;
    }

    setDataSourceTesting(true);
    setDataSourceTestResult(null);

    const response = await apiClient.post<DataSourceTestResult>('/datasources/test', {
      tenantId: previewTenantId,
      dataSourceId: formData.dataSourceId,
    });

    setDataSourceTesting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else if (response.data) {
      setDataSourceTestResult(response.data);
    }
  };

  const handleCopyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      toast.success('Path copiado');
    } catch {
      toast.error('NÃ£o foi possÃ­vel copiar o path');
    }
  };

  const renderDataSourceTestResult = (result: DataSourceTestResult) => (
    <div className="space-y-3">
      <div className={`rounded-lg p-3 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center justify-between text-sm">
          <span className={`font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            HTTP {result.httpStatus}
          </span>
          <span className="text-slate-600">{result.duration}ms</span>
        </div>
      </div>

      <div className="bg-slate-900 rounded-lg p-3">
        <pre className="text-slate-300 text-xs overflow-x-auto max-h-48">
          {JSON.stringify(result.extractedData ?? result.response, null, 2)}
        </pre>
      </div>

      {result.detectedPaths && result.detectedPaths.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-slate-600 mb-2">Paths detectados</h4>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
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

  const handleCreate = () => {
    setSelectedTemplate(null);
    const defaultDataSource = dataSources[0] || null;
    setSelectedDataSource(defaultDataSource);
    setFormData({
      name: '',
      description: '',
      dataSourceId: defaultDataSource?.id || null,
      messageBody: '',
      isActive: true,
    });
    setDataSourceTestResult(null);
    setIsModalOpen(true);
  };

  const handleEdit = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    const dataSource = dataSources.find((ds) => ds.id === template.dataSourceId) || null;
    setSelectedDataSource(dataSource);
    setFormData({
      name: template.name,
      description: template.description || '',
      dataSourceId: template.dataSourceId,
      messageBody: template.messageBody,
      isActive: template.isActive,
    });
    setDataSourceTestResult(null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteModalOpen(true);
  };

  const handlePreviewClick = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setPreviewData(null);
    setIsPreviewModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTemplate) return;

    setSubmitting(true);
    const response = await apiClient.delete(`/templates/${selectedTemplate.id}`);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Template excluído com sucesso');
      setIsDeleteModalOpen(false);
      loadData();
    }
  };

  const handlePreview = async () => {
    if (!selectedTemplate || !previewTenantId) {
      toast.error('Selecione um tenant para preview');
      return;
    }

    setPreviewLoading(true);
    const response = await apiClient.post<MessageTemplatePreview>(`/templates/${selectedTemplate.id}/preview`, {
      tenantId: previewTenantId,
    });
    setPreviewLoading(false);

    if (response.error) {
      toast.error(response.error.message);
    } else if (response.data) {
      setPreviewData(response.data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!formData.messageBody.trim()) {
      toast.error('Corpo da mensagem obrigatorio');
      return;
    }
    if (!formData.dataSourceId) {
      toast.error('Selecione uma fonte de dados');
      return;
    }

    setSubmitting(true);
    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      dataSourceId: formData.dataSourceId,
      messageBody: formData.messageBody,
      isActive: formData.isActive,
    };

    const response = selectedTemplate
      ? await apiClient.put(`/templates/${selectedTemplate.id}`, payload)
      : await apiClient.post('/templates', payload);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success(selectedTemplate ? 'Template atualizado' : 'Template criado');
      setIsModalOpen(false);
      loadData();
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById('messageBody') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.messageBody;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = `${before}{{${placeholder}}}${after}`;
      setFormData({ ...formData, messageBody: newText });

      setTimeout(() => {
        textarea.focus();
        const newPos = start + placeholder.length + 4;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }
  };

  const suggestedPaths = (() => {
    const paths: string[] = [];
    const seen = new Set<string>();
    const addPaths = (items?: string[] | null) => {
      if (!items) return;
      items.forEach((item) => {
        if (!item || seen.has(item)) return;
        seen.add(item);
        paths.push(item);
      });
    };

    addPaths(dataSourceTestResult?.detectedPaths);
    addPaths(selectedDataSource?.lastTestPaths);

    const modulePreset = selectedDataSource
      ? dataSourceModules.find((module) => module.id === selectedDataSource.module)
      : null;
    addPaths(modulePreset?.defaultDataSource.availableFields);

    return paths;
  })();

  const columns = [
    {
      header: 'Nome',
      accessor: (row: MessageTemplate) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-100 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <div className="font-medium text-slate-900">{row.name}</div>
            <div className="text-xs text-slate-500">{row.description || 'Sem descrição'}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Fonte de Dados',
      accessor: (row: MessageTemplate) => (
        row.dataSource ? (
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-slate-600">{row.dataSource.name}</span>
          </div>
        ) : (
          <span className="text-sm text-slate-400">Nenhuma</span>
        )
      ),
    },
    {
      header: 'Regras',
      accessor: (row: MessageTemplate) => (
        <span className="text-sm text-slate-600">
          {row._count?.rules || 0}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: MessageTemplate) => (
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
      accessor: (row: MessageTemplate) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePreviewClick(row)}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Preview"
          >
            <Eye className="h-4 w-4" />
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
    <AppLayout title="Templates de Mensagem">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-slate-600">
              Configure templates de mensagem para notificações WhatsApp com placeholders dinâmicos.
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>

        {/* Tabela */}
        <Table
          columns={columns}
          data={templates}
          loading={loading}
          emptyMessage="Nenhum template cadastrado"
          emptyAction={
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Criar template
            </Button>
          }
        />
      </div>

      {/* Modal de Criação/Edição */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedTemplate ? 'Editar Template' : 'Novo Template'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome do Template *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Notificação de Assinatura Pendente"
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Fonte de Dados *
              </label>
              <select
                value={formData.dataSourceId || ''}
                onChange={(e) => handleDataSourceChange(e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="">Selecione uma fonte...</option>
                {dataSources.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.module || ds.apiModule})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Descrição"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descrição opcional do template"
          />

          {selectedDataSource && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Sparkles className="h-4 w-4" />
                Modelos de texto ({selectedDataSource.module})
              </div>
              <div className="flex flex-wrap gap-2">
                {templatePresets
                  .filter((preset) => preset.module === selectedDataSource.module)
                  .map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyTemplatePreset(preset)}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-700 hover:bg-slate-300"
                      title={preset.description}
                    >
                      {preset.name}
                    </button>
                  ))}
                {templatePresets.filter((preset) => preset.module === selectedDataSource.module).length === 0 && (
                  <span className="text-xs text-slate-500">Nenhum modelo disponÃ­vel para este mÃ³dulo.</span>
                )}
              </div>
            </div>
          )}

          {/* Corpo da Mensagem */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Corpo da Mensagem *
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              <span className="text-xs text-slate-500 mr-2">Inserir:</span>
              {suggestedPaths.slice(0, 12).map((path) => (
                <button
                  key={path}
                  type="button"
                  onClick={() => insertPlaceholder(path)}
                  className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                >
                  {path}
                </button>
              ))}
              {suggestedPaths.length === 0 && (
                <span className="text-xs text-slate-400">
                  {selectedDataSource
                    ? 'Execute um teste para sugerir campos'
                    : 'Selecione uma fonte para sugerir campos'}
                </span>
              )}
            </div>
            <textarea
              id="messageBody"
              value={formData.messageBody}
              onChange={(e) => setFormData({ ...formData, messageBody: e.target.value })}
              rows={8}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono text-sm"
              placeholder="Ola {{name}}, sua mensagem aqui..."
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Use {'{{campo}}'} para inserir valores dinamicos. Ex: {'{{signers[0].name}}'}, {'{{signers.0.name}}'}, {'{{name}}'}
            </p>
          </div>


          {selectedDataSource && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Database className="h-4 w-4" />
                  Dados da Fonte ({selectedDataSource.name})
                </div>
                <Button type="button" variant="secondary" onClick={handleDataSourceTest} loading={dataSourceTesting}>
                  <Play className="h-4 w-4 mr-2" />
                  Testar Fonte
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tenant para teste
                </label>
                <select
                  value={previewTenantId}
                  onChange={(e) => setPreviewTenantId(e.target.value)}
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

              {dataSourceTestResult ? (
                renderDataSourceTestResult(dataSourceTestResult)
              ) : (
                <>
                  {selectedDataSource.lastTestExtractedData || selectedDataSource.lastTestResponse ? (
                    <div className="bg-slate-900 rounded-lg p-3">
                      <pre className="text-slate-300 text-xs overflow-x-auto max-h-48">
                        {JSON.stringify(selectedDataSource.lastTestExtractedData ?? selectedDataSource.lastTestResponse, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Nenhum teste executado ainda para esta fonte.</p>
                  )}

                  {selectedDataSource.lastTestPaths && selectedDataSource.lastTestPaths.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-600 mb-2">Paths detectados</h4>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {selectedDataSource.lastTestPaths.map((path) => (
                          <button
                            key={path}
                            type="button"
                            onClick={() => handleCopyPath(path)}
                            className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs hover:bg-slate-200"
                          >
                            <Copy className="h-3 w-3" />
                            {path}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700">
              Template ativo
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {selectedTemplate ? 'Salvar Alterações' : 'Criar Template'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Preview */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title={`Preview: ${selectedTemplate?.name || ''}`}
        size="xl"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tenant para preview *
                </label>
                <select
                  value={previewTenantId}
                  onChange={(e) => setPreviewTenantId(e.target.value)}
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
              <Button onClick={handlePreview} loading={previewLoading} disabled={!previewTenantId}>
                <Eye className="h-4 w-4 mr-2" />
                Gerar Preview
              </Button>
            </div>
          </div>

          {previewData && (
            <div className="space-y-4">
              {/* Template Original */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Template Original</h4>
                <div className="bg-slate-100 rounded-lg p-3">
                  <pre className="text-sm text-slate-600 whitespace-pre-wrap">{previewData.template}</pre>
                </div>
              </div>

              {/* Mensagem Renderizada */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Mensagem Renderizada</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <pre className="text-sm text-slate-800 whitespace-pre-wrap">{previewData.rendered}</pre>
                </div>
              </div>

              {/* Placeholders Usados */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Placeholders</h4>
                <div className="flex flex-wrap gap-2">
                  {previewData.placeholders.map((p, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {`{{${p}}}`}
                    </span>
                  ))}
                </div>
              </div>


              {/* Dados de Amostra */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Dados de Amostra (JSON)</h4>
                <div className="bg-slate-900 rounded-lg p-3">
                  <pre className="text-slate-300 text-xs overflow-x-auto max-h-48">
                    {JSON.stringify(previewData.sampleData, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
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
                Excluir template "{selectedTemplate?.name}"?
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Esta ação não pode ser desfeita.
              </p>
              {selectedTemplate?._count && selectedTemplate._count.rules > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                  Este template está sendo usado por {selectedTemplate._count.rules} regra(s).
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
              disabled={selectedTemplate?._count && selectedTemplate._count.rules > 0}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
