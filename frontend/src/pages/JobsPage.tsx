import { useState, useEffect } from 'react';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { apiClient } from '@/api/client';
import { WhatsAppJob, WhatsAppSource, WhatsAppTemplate, Tenant, statusColors, statusLabels } from '@/api/types';
import { 
  Plus, Edit, Trash2, Zap, AlertTriangle, Play, Pause, Clock, 
  Calendar, Settings, ChevronDown, ChevronUp, BarChart3 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CRON_EXAMPLES = [
  { label: 'A cada hora', cron: '0 0 * * * *' },
  { label: 'A cada 30 min', cron: '0 */30 * * * *' },
  { label: 'Diário às 8h', cron: '0 0 8 * * *' },
  { label: 'Diário às 8h e 14h', cron: '0 0 8,14 * * *' },
  { label: 'Seg-Sex às 9h', cron: '0 0 9 * * 1-5' },
];

const TIMEZONE_OPTIONS = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'America/Manaus', label: 'Manaus (AMT)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (BRT)' },
  { value: 'UTC', label: 'UTC' },
];

export function JobsPage() {
  const [jobs, setJobs] = useState<WhatsAppJob[]>([]);
  const [sources, setSources] = useState<WhatsAppSource[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<WhatsAppJob | null>(null);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formData, setFormData] = useState({
    tenantId: '',
    name: '',
    description: '',
    sourceId: '',
    templateId: '',
    cronExpression: '0 0 8 * * *',
    timezone: 'America/Sao_Paulo',
    // Janela de execução
    useExecutionWindow: false,
    windowStartTime: '08:00',
    windowEndTime: '18:00',
    windowDaysOfWeek: [1, 2, 3, 4, 5],
    // Configuração de destinatário
    phoneField: 'phone',
    nameField: 'name',
    formatPhone: true,
    defaultCountryCode: '55',
    // Configuração de execução
    maxMessagesPerRun: 100,
    delayBetweenMessages: 1000,
    idempotencyField: 'id',
    idempotencyTTLHours: 24,
    isActive: true,
  });

  const loadData = async () => {
    setLoading(true);
    
    const [jobsRes, sourcesRes, templatesRes, tenantsRes] = await Promise.all([
      apiClient.get<WhatsAppJob[]>(`/whatsapp/jobs${selectedTenantFilter ? `?tenantId=${selectedTenantFilter}` : ''}`),
      apiClient.get<WhatsAppSource[]>('/whatsapp/sources?pageSize=100'),
      apiClient.get<WhatsAppTemplate[]>('/whatsapp/templates?pageSize=100'),
      apiClient.get<Tenant[]>('/tenants?pageSize=100'),
    ]);

    if (jobsRes.data) setJobs(jobsRes.data);
    if (sourcesRes.data) setSources(sourcesRes.data);
    if (templatesRes.data) setTemplates(templatesRes.data);
    if (tenantsRes.data) setTenants(tenantsRes.data);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedTenantFilter]);

  // Filtrar sources e templates pelo tenant selecionado
  const filteredSources = sources.filter(s => s.tenantId === formData.tenantId);
  const filteredTemplates = templates.filter(t => t.tenantId === formData.tenantId);

  const handleCreate = () => {
    setSelectedJob(null);
    setFormData({
      tenantId: selectedTenantFilter || (tenants[0]?.id || ''),
      name: '',
      description: '',
      sourceId: '',
      templateId: '',
      cronExpression: '0 0 8 * * *',
      timezone: 'America/Sao_Paulo',
      useExecutionWindow: false,
      windowStartTime: '08:00',
      windowEndTime: '18:00',
      windowDaysOfWeek: [1, 2, 3, 4, 5],
      phoneField: 'phone',
      nameField: 'name',
      formatPhone: true,
      defaultCountryCode: '55',
      maxMessagesPerRun: 100,
      delayBetweenMessages: 1000,
      idempotencyField: 'id',
      idempotencyTTLHours: 24,
      isActive: true,
    });
    setShowAdvanced(false);
    setIsModalOpen(true);
  };

  const handleEdit = (job: WhatsAppJob) => {
    setSelectedJob(job);
    setFormData({
      tenantId: job.tenantId,
      name: job.name,
      description: job.description || '',
      sourceId: job.sourceId,
      templateId: job.templateId,
      cronExpression: job.cronExpression,
      timezone: job.timezone,
      useExecutionWindow: !!job.executionWindow,
      windowStartTime: job.executionWindow?.startTime || '08:00',
      windowEndTime: job.executionWindow?.endTime || '18:00',
      windowDaysOfWeek: job.executionWindow?.daysOfWeek || [1, 2, 3, 4, 5],
      phoneField: job.recipientConfig.phoneField,
      nameField: job.recipientConfig.nameField || '',
      formatPhone: job.recipientConfig.formatPhone,
      defaultCountryCode: job.recipientConfig.defaultCountryCode,
      maxMessagesPerRun: job.executionConfig.maxMessagesPerRun,
      delayBetweenMessages: job.executionConfig.delayBetweenMessages,
      idempotencyField: job.executionConfig.idempotencyField,
      idempotencyTTLHours: job.executionConfig.idempotencyTTLHours,
      isActive: job.isActive,
    });
    setShowAdvanced(true);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (job: WhatsAppJob) => {
    setSelectedJob(job);
    setIsDeleteModalOpen(true);
  };

  const handleToggleActive = async (job: WhatsAppJob) => {
    const response = await apiClient.patch(`/whatsapp/jobs/${job.id}`, {
      isActive: !job.isActive,
    });

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success(job.isActive ? 'Job pausado' : 'Job ativado');
      loadData();
    }
  };

  const handleRunNow = async (job: WhatsAppJob) => {
    const response = await apiClient.post(`/whatsapp/jobs/${job.id}/run`);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Execução iniciada');
      loadData();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedJob) return;

    setSubmitting(true);
    const response = await apiClient.delete(`/whatsapp/jobs/${selectedJob.id}`);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Job excluído com sucesso');
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
    if (!formData.sourceId) {
      toast.error('Selecione uma fonte de dados');
      return;
    }
    if (!formData.templateId) {
      toast.error('Selecione um template');
      return;
    }

    setSubmitting(true);
    const payload = {
      tenantId: formData.tenantId,
      name: formData.name,
      description: formData.description || null,
      sourceId: formData.sourceId,
      templateId: formData.templateId,
      cronExpression: formData.cronExpression,
      timezone: formData.timezone,
      executionWindow: formData.useExecutionWindow ? {
        startTime: formData.windowStartTime,
        endTime: formData.windowEndTime,
        daysOfWeek: formData.windowDaysOfWeek,
      } : null,
      recipientConfig: {
        phoneField: formData.phoneField,
        nameField: formData.nameField || undefined,
        formatPhone: formData.formatPhone,
        defaultCountryCode: formData.defaultCountryCode,
      },
      executionConfig: {
        maxMessagesPerRun: formData.maxMessagesPerRun,
        delayBetweenMessages: formData.delayBetweenMessages,
        idempotencyField: formData.idempotencyField,
        idempotencyTTLHours: formData.idempotencyTTLHours,
      },
      isActive: formData.isActive,
    };

    const response = selectedJob
      ? await apiClient.put(`/whatsapp/jobs/${selectedJob.id}`, payload)
      : await apiClient.post('/whatsapp/jobs', payload);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success(selectedJob ? 'Job atualizado' : 'Job criado');
      setIsModalOpen(false);
      loadData();
    }
  };

  const columns = [
    {
      header: 'Nome',
      accessor: (row: WhatsAppJob) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center",
            row.isActive ? "bg-emerald-100" : "bg-slate-100"
          )}>
            <Zap className={cn("h-5 w-5", row.isActive ? "text-emerald-600" : "text-slate-400")} />
          </div>
          <div>
            <div className="font-medium text-slate-900">{row.name}</div>
            <div className="text-xs text-slate-500">{row.description || 'Sem descrição'}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Agendamento',
      accessor: (row: WhatsAppJob) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <code className="text-xs bg-slate-100 px-2 py-1 rounded">
            {row.cronExpression}
          </code>
        </div>
      ),
    },
    {
      header: 'Tenant',
      accessor: (row: WhatsAppJob) => (
        <span className="text-sm text-slate-600">
          {row.tenant?.name || tenants.find(t => t.id === row.tenantId)?.name || '-'}
        </span>
      ),
    },
    {
      header: 'Última Execução',
      accessor: (row: WhatsAppJob) => (
        <div className="text-sm">
          {row.lastRunAt ? (
            <div>
              <div className="text-slate-900">
                {new Date(row.lastRunAt).toLocaleString('pt-BR', { 
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                })}
              </div>
              {row.lastRunStatus && (
                <span className={cn(
                  "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
                  statusColors[row.lastRunStatus]?.bg,
                  statusColors[row.lastRunStatus]?.text
                )}>
                  {statusLabels[row.lastRunStatus] || row.lastRunStatus}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400">Nunca executado</span>
          )}
        </div>
      ),
    },
    {
      header: 'Estatísticas',
      accessor: (row: WhatsAppJob) => (
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>{row.totalRuns} runs</span>
          </div>
          <div>
            <span>{row.totalMessagesSent} msgs</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row: WhatsAppJob) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.isActive 
            ? 'bg-green-100 text-green-700' 
            : 'bg-slate-100 text-slate-500'
        }`}>
          {row.isActive ? 'Ativo' : 'Pausado'}
        </span>
      ),
    },
    {
      header: 'Ações',
      accessor: (row: WhatsAppJob) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleRunNow(row)}
            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Executar agora"
          >
            <Play className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleToggleActive(row)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              row.isActive 
                ? "text-slate-400 hover:text-yellow-600 hover:bg-yellow-50" 
                : "text-slate-400 hover:text-green-600 hover:bg-green-50"
            )}
            title={row.isActive ? 'Pausar' : 'Ativar'}
          >
            {row.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
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
    <AppLayout title="Jobs de Envio">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-slate-600">
              Configure quando e como as mensagens serão enviadas automaticamente.
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Job
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
          data={jobs}
          loading={loading}
          emptyMessage="Nenhum job cadastrado"
          emptyAction={
            <Button onClick={handleCreate} variant="secondary">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro job
            </Button>
          }
        />
      </div>

      {/* Modal de Criação/Edição */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedJob ? 'Editar Job' : 'Novo Job'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tenant e Nome */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Tenant *
              </label>
              <select
                value={formData.tenantId}
                onChange={(e) => setFormData({ ...formData, tenantId: e.target.value, sourceId: '', templateId: '' })}
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
            <Input
              label="Nome do Job"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Notificação de Assinaturas Pendentes"
              required
            />
          </div>

          <Input
            label="Descrição"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descrição opcional do job"
          />

          {/* Fonte e Template */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Fonte de Dados *
              </label>
              <select
                value={formData.sourceId}
                onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                required
                disabled={!formData.tenantId}
              >
                <option value="">Selecione...</option>
                {filteredSources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
              {formData.tenantId && filteredSources.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Nenhuma fonte cadastrada para este tenant
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Template de Mensagem *
              </label>
              <select
                value={formData.templateId}
                onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                required
                disabled={!formData.tenantId}
              >
                <option value="">Selecione...</option>
                {filteredTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.displayName || template.name}
                  </option>
                ))}
              </select>
              {formData.tenantId && filteredTemplates.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Nenhum template cadastrado para este tenant
                </p>
              )}
            </div>
          </div>

          {/* Agendamento */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Calendar className="h-4 w-4" />
              Agendamento
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Expressão Cron *
                </label>
                <input
                  type="text"
                  value={formData.cronExpression}
                  onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono text-sm"
                  placeholder="0 0 8 * * *"
                  required
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {CRON_EXAMPLES.map((ex) => (
                    <button
                      key={ex.cron}
                      type="button"
                      onClick={() => setFormData({ ...formData, cronExpression: ex.cron })}
                      className="text-xs px-2 py-1 bg-white border border-slate-200 rounded hover:bg-primary hover:text-white hover:border-primary transition-colors"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Configurações Avançadas */}
          <div className="border border-slate-200 rounded-lg">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurações Avançadas
              </div>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showAdvanced && (
              <div className="px-4 pb-4 space-y-4 border-t">
                {/* Configuração de Destinatário */}
                <div className="pt-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">Configuração de Destinatário</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Campo do Telefone"
                      value={formData.phoneField}
                      onChange={(e) => setFormData({ ...formData, phoneField: e.target.value })}
                      placeholder="phone"
                      hint="Campo na fonte com o telefone"
                    />
                    <Input
                      label="Campo do Nome"
                      value={formData.nameField}
                      onChange={(e) => setFormData({ ...formData, nameField: e.target.value })}
                      placeholder="name"
                      hint="Campo na fonte com o nome (opcional)"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="formatPhone"
                        checked={formData.formatPhone}
                        onChange={(e) => setFormData({ ...formData, formatPhone: e.target.checked })}
                        className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
                      />
                      <label htmlFor="formatPhone" className="text-sm text-slate-700">
                        Formatar telefone automaticamente
                      </label>
                    </div>
                    <Input
                      label="Código do País Padrão"
                      value={formData.defaultCountryCode}
                      onChange={(e) => setFormData({ ...formData, defaultCountryCode: e.target.value })}
                      placeholder="55"
                    />
                  </div>
                </div>

                {/* Configuração de Execução */}
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-slate-700 mb-3">Configuração de Execução</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Máx. Mensagens por Execução"
                      type="number"
                      value={formData.maxMessagesPerRun.toString()}
                      onChange={(e) => setFormData({ ...formData, maxMessagesPerRun: parseInt(e.target.value) || 100 })}
                      min={1}
                      max={1000}
                    />
                    <Input
                      label="Delay entre Mensagens (ms)"
                      type="number"
                      value={formData.delayBetweenMessages.toString()}
                      onChange={(e) => setFormData({ ...formData, delayBetweenMessages: parseInt(e.target.value) || 1000 })}
                      min={100}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Input
                      label="Campo de Idempotência"
                      value={formData.idempotencyField}
                      onChange={(e) => setFormData({ ...formData, idempotencyField: e.target.value })}
                      placeholder="id"
                      hint="Campo único para evitar duplicatas"
                    />
                    <Input
                      label="TTL da Idempotência (horas)"
                      type="number"
                      value={formData.idempotencyTTLHours.toString()}
                      onChange={(e) => setFormData({ ...formData, idempotencyTTLHours: parseInt(e.target.value) || 24 })}
                      min={1}
                      hint="Tempo para permitir reenvio"
                    />
                  </div>
                </div>
              </div>
            )}
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
              Job ativo (será executado conforme agendamento)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {selectedJob ? 'Salvar Alterações' : 'Criar Job'}
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
                Excluir job "{selectedJob?.name}"?
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Esta ação não pode ser desfeita. O histórico de execuções será mantido.
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
