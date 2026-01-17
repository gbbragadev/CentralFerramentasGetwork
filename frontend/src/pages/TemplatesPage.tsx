import { useState, useEffect } from 'react';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { apiClient } from '@/api/client';
import { WhatsAppTemplate, Tenant, templateTypeLabels, TemplateType } from '@/api/types';
import { Plus, Edit, Trash2, MessageSquareText, AlertTriangle, Eye } from 'lucide-react';
import { toast } from 'sonner';

const TEMPLATE_TYPE_OPTIONS: { value: TemplateType; label: string; description: string }[] = [
  { 
    value: 'meta_template', 
    label: 'Template Meta (Aprovado)', 
    description: 'Use um template já aprovado pela Meta no WhatsApp Business' 
  },
  { 
    value: 'custom_text', 
    label: 'Texto Personalizado', 
    description: 'Crie uma mensagem personalizada (apenas para modo mock)' 
  },
  { 
    value: 'senior_notification', 
    label: 'Notificação Senior X', 
    description: 'Busque uma notificação existente no Senior X' 
  },
];

export function TemplatesPage() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    tenantId: '',
    name: '',
    displayName: '',
    templateType: 'custom_text' as TemplateType,
    metaTemplateName: '',
    metaTemplateLanguage: 'pt_BR',
    messageBody: '',
    fieldMapping: '{}',
    seniorNotificationEndpoint: '',
    isActive: true,
  });

  const loadData = async () => {
    setLoading(true);
    
    const [templatesRes, tenantsRes] = await Promise.all([
      apiClient.get<WhatsAppTemplate[]>(`/whatsapp/templates${selectedTenantFilter ? `?tenantId=${selectedTenantFilter}` : ''}`),
      apiClient.get<Tenant[]>('/tenants?pageSize=100'),
    ]);

    if (templatesRes.data) setTemplates(templatesRes.data);
    if (tenantsRes.data) setTenants(tenantsRes.data);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedTenantFilter]);

  const handleCreate = () => {
    setSelectedTemplate(null);
    setFormData({
      tenantId: selectedTenantFilter || (tenants[0]?.id || ''),
      name: '',
      displayName: '',
      templateType: 'custom_text',
      metaTemplateName: '',
      metaTemplateLanguage: 'pt_BR',
      messageBody: 'Olá {{nome}},\n\nVocê tem um documento pendente de assinatura: {{documento}}.\n\nAcesse: {{link}}',
      fieldMapping: '{\n  "nome": "signerName",\n  "documento": "documentName",\n  "link": "signatureLink"\n}',
      seniorNotificationEndpoint: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      tenantId: template.tenantId,
      name: template.name,
      displayName: template.displayName || '',
      templateType: template.templateType,
      metaTemplateName: template.metaTemplateName || '',
      metaTemplateLanguage: template.metaTemplateLanguage,
      messageBody: template.messageBody || '',
      fieldMapping: JSON.stringify(template.fieldMapping, null, 2),
      seniorNotificationEndpoint: template.seniorNotificationEndpoint || '',
      isActive: template.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteModalOpen(true);
  };

  const handlePreview = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTemplate) return;

    setSubmitting(true);
    const response = await apiClient.delete(`/whatsapp/templates/${selectedTemplate.id}`);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Template excluído com sucesso');
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

    // Validar JSON do field mapping
    let fieldMapping = {};
    try {
      fieldMapping = JSON.parse(formData.fieldMapping);
    } catch {
      toast.error('Mapeamento de campos deve ser um JSON válido');
      return;
    }

    // Validações específicas por tipo
    if (formData.templateType === 'meta_template' && !formData.metaTemplateName.trim()) {
      toast.error('Nome do template Meta é obrigatório');
      return;
    }
    if (formData.templateType === 'custom_text' && !formData.messageBody.trim()) {
      toast.error('Corpo da mensagem é obrigatório');
      return;
    }

    setSubmitting(true);
    const payload = {
      ...formData,
      fieldMapping,
    };

    const response = selectedTemplate
      ? await apiClient.put(`/whatsapp/templates/${selectedTemplate.id}`, payload)
      : await apiClient.post('/whatsapp/templates', payload);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success(selectedTemplate ? 'Template atualizado' : 'Template criado');
      setIsModalOpen(false);
      loadData();
    }
  };

  const columns = [
    {
      header: 'Nome',
      accessor: (row: WhatsAppTemplate) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center">
            <MessageSquareText className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <div className="font-medium text-slate-900">{row.displayName || row.name}</div>
            <div className="text-xs text-slate-500">{row.name}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Tipo',
      accessor: (row: WhatsAppTemplate) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.templateType === 'meta_template' 
            ? 'bg-blue-100 text-blue-700'
            : row.templateType === 'custom_text'
            ? 'bg-purple-100 text-purple-700'
            : 'bg-orange-100 text-orange-700'
        }`}>
          {templateTypeLabels[row.templateType]}
        </span>
      ),
    },
    {
      header: 'Tenant',
      accessor: (row: WhatsAppTemplate) => (
        <span className="text-sm text-slate-600">
          {row.tenant?.name || tenants.find(t => t.id === row.tenantId)?.name || '-'}
        </span>
      ),
    },
    {
      header: 'Preview',
      accessor: (row: WhatsAppTemplate) => (
        <div className="max-w-xs truncate text-sm text-slate-500">
          {row.messageBody || row.metaTemplateName || '-'}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row: WhatsAppTemplate) => (
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
      accessor: (row: WhatsAppTemplate) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePreview(row)}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Visualizar"
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
              Configure os modelos de mensagem para envio via WhatsApp.
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
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
          data={templates}
          loading={loading}
          emptyMessage="Nenhum template cadastrado"
          emptyAction={
            <Button onClick={handleCreate} variant="secondary">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro template
            </Button>
          }
        />
      </div>

      {/* Modal de Criação/Edição */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedTemplate ? 'Editar Template' : 'Novo Template'}
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
                Tipo de Template *
              </label>
              <select
                value={formData.templateType}
                onChange={(e) => setFormData({ ...formData, templateType: e.target.value as TemplateType })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                {TEMPLATE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {TEMPLATE_TYPE_OPTIONS.find(o => o.value === formData.templateType)?.description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome (identificador)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              placeholder="assinatura_pendente"
              hint="Usado internamente para identificação"
              required
            />
            <Input
              label="Nome de Exibição"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="Assinatura Pendente"
            />
          </div>

          {/* Campos específicos por tipo */}
          {formData.templateType === 'meta_template' && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-4">
              <p className="text-sm text-blue-800 font-medium">Configuração do Template Meta</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome do Template na Meta"
                  value={formData.metaTemplateName}
                  onChange={(e) => setFormData({ ...formData, metaTemplateName: e.target.value })}
                  placeholder="documento_pendente"
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Idioma
                  </label>
                  <select
                    value={formData.metaTemplateLanguage}
                    onChange={(e) => setFormData({ ...formData, metaTemplateLanguage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="pt_BR">Português (Brasil)</option>
                    <option value="en_US">English (US)</option>
                    <option value="es">Español</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {formData.templateType === 'custom_text' && (
            <div className="bg-purple-50 rounded-lg p-4 space-y-4">
              <p className="text-sm text-purple-800 font-medium">Mensagem Personalizada</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Corpo da Mensagem *
                </label>
                <textarea
                  value={formData.messageBody}
                  onChange={(e) => setFormData({ ...formData, messageBody: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Olá {{nome}}, você tem um documento pendente..."
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use {'{{campo}}'} para variáveis. Ex: {'{{nome}}'}, {'{{documento}}'}, {'{{link}}'}
                </p>
              </div>
            </div>
          )}

          {formData.templateType === 'senior_notification' && (
            <div className="bg-orange-50 rounded-lg p-4 space-y-4">
              <p className="text-sm text-orange-800 font-medium">Notificação do Senior X</p>
              <Input
                label="Endpoint da Notificação"
                value={formData.seniorNotificationEndpoint}
                onChange={(e) => setFormData({ ...formData, seniorNotificationEndpoint: e.target.value })}
                placeholder="/notifications/queries/getTemplate"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Mapeamento de Campos (JSON)
            </label>
            <textarea
              value={formData.fieldMapping}
              onChange={(e) => setFormData({ ...formData, fieldMapping: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono text-sm"
              placeholder='{"nome": "signerName", "documento": "documentName"}'
            />
            <p className="text-xs text-slate-500 mt-1">
              Mapeia variáveis do template para campos da fonte de dados
            </p>
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
        title="Preview do Template"
      >
        {selectedTemplate && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Tipo</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                selectedTemplate.templateType === 'meta_template' 
                  ? 'bg-blue-100 text-blue-700'
                  : selectedTemplate.templateType === 'custom_text'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-orange-100 text-orange-700'
              }`}>
                {templateTypeLabels[selectedTemplate.templateType]}
              </span>
            </div>

            {selectedTemplate.messageBody && (
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Mensagem</p>
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <pre className="text-sm whitespace-pre-wrap text-slate-700">
                    {selectedTemplate.messageBody}
                  </pre>
                </div>
              </div>
            )}

            {selectedTemplate.metaTemplateName && (
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Template Meta</p>
                <code className="text-sm bg-white px-2 py-1 rounded border border-blue-200">
                  {selectedTemplate.metaTemplateName} ({selectedTemplate.metaTemplateLanguage})
                </code>
              </div>
            )}

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Mapeamento de Campos</p>
              <pre className="text-xs bg-white p-3 rounded border overflow-auto">
                {JSON.stringify(selectedTemplate.fieldMapping, null, 2)}
              </pre>
            </div>
          </div>
        )}
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
                Excluir template "{selectedTemplate?.displayName || selectedTemplate?.name}"?
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Esta ação não pode ser desfeita. Jobs que usam este template serão afetados.
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
