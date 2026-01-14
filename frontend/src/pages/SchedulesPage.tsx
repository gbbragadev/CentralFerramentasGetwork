import { useState, useEffect } from 'react';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { apiClient } from '@/api/client';
import { Schedule, Tenant } from '@/api/types';
import { Plus, Edit, Trash2, Play } from 'lucide-react';
import { toast } from 'sonner';

export function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [filterTenantId, setFilterTenantId] = useState('');
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
      tenantId: '',
      name: '',
      enabled: true,
      cron: '',
      timezone: 'America/Sao_Paulo',
    });
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
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;

    const response = await apiClient.delete(`/schedules/${id}`);
    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Agendamento excluído com sucesso');
      loadSchedules();
    }
  };

  const handleTrigger = async (id: string) => {
    const response = await apiClient.post(`/schedules/${id}/trigger`);
    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Agendamento executado manualmente');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = selectedSchedule
      ? await apiClient.put(`/schedules/${selectedSchedule.id}`, formData)
      : await apiClient.post('/schedules', formData);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success(selectedSchedule ? 'Agendamento atualizado' : 'Agendamento criado');
      setIsModalOpen(false);
      loadSchedules();
    }
  };

  const columns = [
    { header: 'Nome', accessor: 'name' as keyof Schedule },
    {
      header: 'Tenant',
      accessor: (row: Schedule) => tenants.find((t) => t.id === row.tenantId)?.name || row.tenantId,
    },
    { header: 'Cron', accessor: 'cron' as keyof Schedule },
    { header: 'Timezone', accessor: 'timezone' as keyof Schedule },
    {
      header: 'Status',
      accessor: (row: Schedule) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            row.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {row.enabled ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      header: 'Ações',
      accessor: (row: Schedule) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleTrigger(row.id)} title="Executar agora">
            <Play className="h-4 w-4" />
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
    <AppLayout title="Agendamentos">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <p className="text-slate-600">Gerencie os agendamentos de execução</p>
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
            Novo Agendamento
          </Button>
        </div>

        <Table columns={columns} data={schedules} loading={loading} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedSchedule ? 'Editar Agendamento' : 'Novo Agendamento'}>
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
            <Input
              label="Cron Expression"
              value={formData.cron}
              onChange={(e) => setFormData({ ...formData, cron: e.target.value })}
              placeholder="0 0 9 * * *"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Formato: segundo minuto hora dia mês dia-da-semana
              <br />
              Exemplo: "0 0 9 * * *" = Todo dia às 9h
            </p>
          </div>

          <Input
            label="Timezone"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            placeholder="America/Sao_Paulo"
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
