import { useState, useEffect } from 'react';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { apiClient } from '@/api/client';
import { Schedule, Tenant } from '@/api/types';
import { Plus, Edit, Trash2, Play, Calendar, Clock, AlertTriangle, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

// Exemplos comuns de cron
const cronExamples = [
  { label: 'A cada hora', value: '0 0 * * * *', description: 'Executa no minuto 0 de cada hora' },
  { label: 'Todo dia às 9h', value: '0 0 9 * * *', description: 'Executa às 9:00 todos os dias' },
  { label: 'Seg-Sex às 9h', value: '0 0 9 * * 1-5', description: 'Executa às 9:00 de segunda a sexta' },
  { label: 'A cada 30 min', value: '0 */30 * * * *', description: 'Executa a cada 30 minutos' },
  { label: 'Toda segunda 8h', value: '0 0 8 * * 1', description: 'Executa às 8:00 toda segunda-feira' },
];

export function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [filterTenantId, setFilterTenantId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCronHelp, setShowCronHelp] = useState(false);
  const [formData, setFormData] = useState({
    tenantId: '',
    name: '',
    enabled: true,
    cron: '',
    timezone: 'America/Sao_Paulo',
  });

  const loadTenants = async () => {
    const response = await apiClient.get<Tenant[]>('/tenants?page=1&pageSize=100');
    if (response.data) {
      setTenants(response.data);
    }
  };

  const loadSchedules = async () => {
    setLoading(true);
    const query = filterTenantId ? `?tenantId=${filterTenantId}&page=1&pageSize=50` : '?page=1&pageSize=50';
    const response = await apiClient.get<Schedule[]>(`/schedules${query}`);
    if (response.data) {
      setSchedules(response.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTenants();
    loadSchedules();
  }, [filterTenantId]);

  const handleCreate = () => {
    setSelectedSchedule(null);
    setFormData({
      tenantId: filterTenantId || '',
      name: '',
      enabled: true,
      cron: '',
      timezone: 'America/Sao_Paulo',
    });
    setShowCronHelp(false);
    setIsModalOpen(true);
  };

  const handleEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      tenantId: schedule.tenantId,
      name: schedule.name,
      enabled: schedule.enabled,
      cron: schedule.cron,
      timezone: schedule.timezone,
    });
    setShowCronHelp(false);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSchedule) return;

    setSubmitting(true);
    const response = await apiClient.delete(`/schedules/${selectedSchedule.id}`);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Agendamento excluído com sucesso');
      setIsDeleteModalOpen(false);
      loadSchedules();
    }
  };

  const handleTrigger = async (schedule: Schedule) => {
    const response = await apiClient.post(`/schedules/${schedule.id}/trigger`);
    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success(`Agendamento "${schedule.name}" executado manualmente`);
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

    if (!formData.cron.trim()) {
      toast.error('A expressão cron é obrigatória');
      return;
    }

    setSubmitting(true);
    const response = selectedSchedule
      ? await apiClient.put(`/schedules/${selectedSchedule.id}`, formData)
      : await apiClient.post('/schedules', formData);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success(selectedSchedule ? 'Agendamento atualizado' : 'Agendamento criado');
      setIsModalOpen(false);
      loadSchedules();
    }
  };

  const parseCronDescription = (cron: string): string => {
    const parts = cron.split(' ');
    if (parts.length !== 6) return cron;
    
    const [, minute, hour, , , dayOfWeek] = parts;
    
    let desc = '';
    
    if (hour !== '*' && minute !== '*') {
      desc += `às ${hour}:${minute.padStart(2, '0')}`;
    } else if (minute.startsWith('*/')) {
      desc += `a cada ${minute.slice(2)} minutos`;
    } else if (hour.startsWith('*/')) {
      desc += `a cada ${hour.slice(2)} horas`;
    }
    
    if (dayOfWeek === '1-5') {
      desc += ' (seg-sex)';
    } else if (dayOfWeek === '0' || dayOfWeek === '7') {
      desc += ' (domingo)';
    } else if (dayOfWeek === '6') {
      desc += ' (sábado)';
    }
    
    return desc || cron;
  };

  const columns = [
    {
      header: 'Agendamento',
      accessor: (row: Schedule) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-purple-600" />
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
      header: 'Frequência',
      accessor: (row: Schedule) => (
        <div>
          <div className="font-mono text-sm text-slate-900">{row.cron}</div>
          <div className="text-xs text-slate-500">{parseCronDescription(row.cron)}</div>
        </div>
      ),
    },
    {
      header: 'Timezone',
      accessor: (row: Schedule) => (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700">
          <Clock className="h-3 w-3 mr-1" />
          {row.timezone.replace('America/', '')}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Schedule) => (
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
      header: 'Ações',
      accessor: (row: Schedule) => (
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => handleTrigger(row)} 
            title="Executar agora"
            disabled={!row.enabled}
          >
            <Play className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)} title="Editar">
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDeleteClick(row)} title="Excluir">
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Agendamentos">
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
              Novo Agendamento
            </Button>
          </div>
        </div>

        {/* Table */}
        <Table 
          columns={columns} 
          data={schedules} 
          loading={loading}
          emptyMessage="Nenhum agendamento cadastrado"
          emptyAction={
            <Button onClick={handleCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro agendamento
            </Button>
          }
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedSchedule ? 'Editar Agendamento' : 'Novo Agendamento'}
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
            label="Nome do Agendamento"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Verificar documentos pendentes"
            required
          />

          {/* Cron Expression with Help */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">Expressão Cron</label>
              <button
                type="button"
                onClick={() => setShowCronHelp(!showCronHelp)}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <HelpCircle className="h-3 w-3" />
                {showCronHelp ? 'Ocultar ajuda' : 'Ver exemplos'}
              </button>
            </div>
            
            <Input
              value={formData.cron}
              onChange={(e) => setFormData({ ...formData, cron: e.target.value })}
              placeholder="0 0 9 * * *"
              required
            />
            
            <p className="text-xs text-slate-500">
              Formato: segundo minuto hora dia mês dia-da-semana
            </p>

            {/* Cron Help Panel */}
            {showCronHelp && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-slate-700">Exemplos comuns:</p>
                <div className="grid gap-2">
                  {cronExamples.map((example) => (
                    <button
                      key={example.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, cron: example.value })}
                      className="flex items-center justify-between p-2 rounded hover:bg-slate-100 transition-colors text-left"
                    >
                      <div>
                        <span className="text-sm font-medium text-slate-900">{example.label}</span>
                        <span className="text-xs text-slate-500 ml-2">{example.description}</span>
                      </div>
                      <code className="text-xs bg-slate-200 px-2 py-1 rounded font-mono">
                        {example.value}
                      </code>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fuso Horário</label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="America/Sao_Paulo">São Paulo (BRT)</option>
              <option value="America/Manaus">Manaus (AMT)</option>
              <option value="America/Cuiaba">Cuiabá (AMT)</option>
              <option value="America/Fortaleza">Fortaleza (BRT)</option>
              <option value="America/Recife">Recife (BRT)</option>
              <option value="UTC">UTC</option>
            </select>
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
              Agendamento ativo
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {selectedSchedule ? 'Salvar Alterações' : 'Criar Agendamento'}
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
                Excluir agendamento "{selectedSchedule?.name}"?
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Esta ação não pode ser desfeita. O agendamento será removido e não executará mais.
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
              Excluir Agendamento
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
