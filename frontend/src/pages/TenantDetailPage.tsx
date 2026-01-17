import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
// Modal not used in this page currently
import { apiClient } from '@/api/client';
import { Tenant, SeniorCredentials, WhatsAppConfig, TestConnectionResult } from '@/api/types';
import { 
  ArrowLeft, Building2, Key, MessageSquare, Save, RefreshCw, 
  CheckCircle, XCircle, AlertTriangle, Clock, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type TabId = 'general' | 'senior' | 'whatsapp';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const tabs: Tab[] = [
  { id: 'general', label: 'Dados Gerais', icon: Building2 },
  { id: 'senior', label: 'Credenciais Senior', icon: Key },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
];

export function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  // Dados
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [seniorCredentials, setSeniorCredentials] = useState<SeniorCredentials | null>(null);
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig | null>(null);
  
  // Forms
  const [tenantForm, setTenantForm] = useState({
    name: '',
    domain: '',
    displayName: '',
    isActive: true,
  });
  
  const [seniorForm, setSeniorForm] = useState({
    seniorTenant: '',
    username: '',
    password: '',
    environment: 'production' as 'production' | 'sandbox',
    baseUrl: 'https://platform.senior.com.br',
  });
  
  const [whatsappForm, setWhatsappForm] = useState({
    isMockMode: true,
    wabaId: '',
    phoneNumberId: '',
    displayPhoneNumber: '',
    accessToken: '',
  });

  // Carregar dados
  useEffect(() => {
    if (tenantId) {
      loadTenant();
    }
  }, [tenantId]);

  const loadTenant = async () => {
    setLoading(true);
    
    // Carregar tenant
    const tenantRes = await apiClient.get<Tenant>(`/tenants/${tenantId}`);
    if (tenantRes.data) {
      setTenant(tenantRes.data);
      setTenantForm({
        name: tenantRes.data.name,
        domain: tenantRes.data.domain,
        displayName: tenantRes.data.displayName || '',
        isActive: tenantRes.data.isActive,
      });
    }
    
    // Carregar credenciais Senior
    const seniorRes = await apiClient.get<SeniorCredentials>(`/tenants/${tenantId}/senior-credentials`);
    if (seniorRes.data) {
      setSeniorCredentials(seniorRes.data);
      setSeniorForm({
        seniorTenant: seniorRes.data.seniorTenant || '',
        username: seniorRes.data.username || '',
        password: '', // Não retorna por segurança
        environment: seniorRes.data.environment || 'production',
        baseUrl: seniorRes.data.baseUrl || 'https://platform.senior.com.br',
      });
    }
    
    // Carregar config WhatsApp
    const whatsappRes = await apiClient.get<WhatsAppConfig>(`/tenants/${tenantId}/whatsapp-config`);
    if (whatsappRes.data) {
      setWhatsappConfig(whatsappRes.data);
      setWhatsappForm({
        isMockMode: whatsappRes.data.isMockMode,
        wabaId: whatsappRes.data.wabaId || '',
        phoneNumberId: whatsappRes.data.phoneNumberId || '',
        displayPhoneNumber: whatsappRes.data.displayPhoneNumber || '',
        accessToken: '', // Não retorna por segurança
      });
    }
    
    setLoading(false);
  };

  // Salvar dados gerais
  const handleSaveTenant = async () => {
    if (!tenantForm.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!tenantForm.domain.trim()) {
      toast.error('Domínio é obrigatório');
      return;
    }

    setSaving(true);
    const response = await apiClient.put(`/tenants/${tenantId}`, tenantForm);
    setSaving(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Dados salvos com sucesso');
      loadTenant();
    }
  };

  // Salvar credenciais Senior
  const handleSaveSenior = async () => {
    if (!seniorForm.seniorTenant.trim()) {
      toast.error('Tenant Senior é obrigatório');
      return;
    }
    if (!seniorForm.username.trim()) {
      toast.error('Usuário é obrigatório');
      return;
    }
    // Senha só é obrigatória se não existir credenciais
    if (!seniorCredentials && !seniorForm.password.trim()) {
      toast.error('Senha é obrigatória');
      return;
    }

    setSaving(true);
    const payload = {
      ...seniorForm,
      // Só envia senha se foi preenchida
      password: seniorForm.password || undefined,
    };
    
    const response = await apiClient.post(`/tenants/${tenantId}/senior-credentials`, payload);
    setSaving(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Credenciais salvas com sucesso');
      setSeniorForm(prev => ({ ...prev, password: '' }));
      loadTenant();
    }
  };

  // Testar conexão Senior
  const handleTestConnection = async () => {
    setTesting(true);
    const response = await apiClient.post<TestConnectionResult>(`/tenants/${tenantId}/test-senior-connection`);
    setTesting(false);

    if (response.error) {
      toast.error(response.error.message || 'Falha na conexão');
    } else if (response.data?.success) {
      toast.success('Conexão bem-sucedida!');
      loadTenant();
    } else {
      toast.error(response.data?.message || 'Falha na conexão');
    }
  };

  // Salvar config WhatsApp
  const handleSaveWhatsApp = async () => {
    setSaving(true);
    const payload = {
      ...whatsappForm,
      accessToken: whatsappForm.accessToken || undefined,
    };
    
    const response = await apiClient.post(`/tenants/${tenantId}/whatsapp-config`, payload);
    setSaving(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Configurações salvas com sucesso');
      setWhatsappForm(prev => ({ ...prev, accessToken: '' }));
      loadTenant();
    }
  };

  // Renderizar status da conexão Senior
  const renderSeniorStatus = () => {
    if (!seniorCredentials) {
      return (
        <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-slate-400" />
          <div>
            <p className="font-medium text-slate-700">Não configurado</p>
            <p className="text-sm text-slate-500">Configure as credenciais para conectar ao Senior X</p>
          </div>
        </div>
      );
    }

    if (seniorCredentials.lastAuthError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="font-medium text-red-700">Erro na conexão</p>
            <p className="text-sm text-red-600">{seniorCredentials.lastAuthError}</p>
          </div>
        </div>
      );
    }

    if (seniorCredentials.tokenExpiresAt) {
      const expiresAt = new Date(seniorCredentials.tokenExpiresAt);
      const now = new Date();
      const isExpired = expiresAt < now;
      const timeRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000 / 60));

      if (isExpired) {
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="font-medium text-yellow-700">Token expirado</p>
              <p className="text-sm text-yellow-600">O token será renovado automaticamente na próxima requisição</p>
            </div>
          </div>
        );
      }

      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-medium text-green-700">Conectado</p>
            <p className="text-sm text-green-600">
              Último login: {seniorCredentials.lastAuthAt ? new Date(seniorCredentials.lastAuthAt).toLocaleString('pt-BR') : 'N/A'}
              {' • '}Token expira em: {timeRemaining} min
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-slate-400" />
        <div>
          <p className="font-medium text-slate-700">Aguardando conexão</p>
          <p className="text-sm text-slate-500">Clique em "Testar Conexão" para validar as credenciais</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <AppLayout title="Carregando...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!tenant) {
    return (
      <AppLayout title="Tenant não encontrado">
        <div className="text-center py-12">
          <p className="text-slate-500 mb-4">O tenant solicitado não foi encontrado.</p>
          <Button onClick={() => navigate('/tenants')}>Voltar para Tenants</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Editar: ${tenant.name}`}>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="secondary" onClick={() => navigate('/tenants')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{tenant.name}</h1>
            <p className="text-sm text-slate-500">{tenant.domain}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-6">
          <nav className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {/* Dados Gerais */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome da Empresa"
                  value={tenantForm.name}
                  onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
                  placeholder="Ex: Empresa ABC Ltda"
                  required
                />
                <Input
                  label="Domínio/Identificador"
                  value={tenantForm.domain}
                  onChange={(e) => setTenantForm({ ...tenantForm, domain: e.target.value.toLowerCase() })}
                  placeholder="Ex: empresa-abc"
                  hint="Identificador único usado em URLs e integrações"
                  required
                />
              </div>

              <Input
                label="Nome de Exibição"
                value={tenantForm.displayName}
                onChange={(e) => setTenantForm({ ...tenantForm, displayName: e.target.value })}
                placeholder="Nome amigável para exibição"
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={tenantForm.isActive}
                  onChange={(e) => setTenantForm({ ...tenantForm, isActive: e.target.checked })}
                  className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
                />
                <label htmlFor="isActive" className="text-sm text-slate-700">
                  Tenant ativo
                </label>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSaveTenant} loading={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}

          {/* Credenciais Senior */}
          {activeTab === 'senior' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Como funciona:</strong> Informe os dados de acesso ao Senior X. 
                  O sistema fará login automaticamente para obter e renovar o token de autenticação.
                </p>
              </div>

              {/* Status da conexão */}
              {renderSeniorStatus()}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Tenant Senior X"
                  value={seniorForm.seniorTenant}
                  onChange={(e) => setSeniorForm({ ...seniorForm, seniorTenant: e.target.value })}
                  placeholder="empresa.com.br"
                  hint="Domínio do tenant no Senior X"
                  required
                />
                <Input
                  label="Usuário"
                  value={seniorForm.username}
                  onChange={(e) => setSeniorForm({ ...seniorForm, username: e.target.value })}
                  placeholder="forbiz"
                  hint="Usuário de integração"
                  required
                />
              </div>

              <Input
                label={seniorCredentials ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                type="password"
                value={seniorForm.password}
                onChange={(e) => setSeniorForm({ ...seniorForm, password: e.target.value })}
                placeholder="••••••••"
                required={!seniorCredentials}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Ambiente
                  </label>
                  <select
                    value={seniorForm.environment}
                    onChange={(e) => setSeniorForm({ ...seniorForm, environment: e.target.value as 'production' | 'sandbox' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="production">Produção</option>
                    <option value="sandbox">Homologação</option>
                  </select>
                </div>
                <Input
                  label="URL Base"
                  value={seniorForm.baseUrl}
                  onChange={(e) => setSeniorForm({ ...seniorForm, baseUrl: e.target.value })}
                  placeholder="https://platform.senior.com.br"
                />
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button 
                  variant="secondary" 
                  onClick={handleTestConnection} 
                  loading={testing}
                  disabled={!seniorCredentials}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Testar Conexão
                </Button>
                <Button onClick={handleSaveSenior} loading={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Credenciais
                </Button>
              </div>
            </div>
          )}

          {/* WhatsApp */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isMockMode"
                    checked={whatsappForm.isMockMode}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, isMockMode: e.target.checked })}
                    className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
                  />
                  <label htmlFor="isMockMode" className="text-sm font-medium text-slate-700">
                    Modo Simulado (Mock)
                  </label>
                </div>
                <p className="text-xs text-slate-500 ml-6">
                  Quando ativado, as mensagens são simuladas localmente sem enviar para o WhatsApp real.
                  Útil para testes e demonstrações.
                </p>
              </div>

              {!whatsappForm.isMockMode && (
                <>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Atenção:</strong> Para usar o WhatsApp real, você precisa de uma conta 
                      WhatsApp Business API (WABA) configurada na Meta.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="WABA ID"
                      value={whatsappForm.wabaId}
                      onChange={(e) => setWhatsappForm({ ...whatsappForm, wabaId: e.target.value })}
                      placeholder="ID da conta WhatsApp Business"
                    />
                    <Input
                      label="Phone Number ID"
                      value={whatsappForm.phoneNumberId}
                      onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumberId: e.target.value })}
                      placeholder="ID do número de telefone"
                    />
                  </div>

                  <Input
                    label="Número de Exibição"
                    value={whatsappForm.displayPhoneNumber}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, displayPhoneNumber: e.target.value })}
                    placeholder="+55 11 99999-9999"
                  />

                  <Input
                    label={whatsappConfig?.wabaId ? 'Novo Access Token (deixe em branco para manter)' : 'Access Token'}
                    type="password"
                    value={whatsappForm.accessToken}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, accessToken: e.target.value })}
                    placeholder="Token de acesso da Meta"
                  />
                </>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSaveWhatsApp} loading={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
