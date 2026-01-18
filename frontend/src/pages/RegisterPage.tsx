import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { BrandMark } from '@/components/BrandMark';
import { apiClient } from '@/api/client';
import { Mail, Lock, User, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('Email é obrigatório');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);
    const response = await apiClient.post('/auth/register', {
      name: formData.name,
      email: formData.email,
      password: formData.password,
    });
    setLoading(false);

    if (response.error) {
      toast.error(response.error.message || 'Erro ao criar conta');
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/70 p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Conta Criada!</h2>
            <p className="text-slate-600 mb-6">
              Sua conta foi criada com sucesso. Você já pode fazer login.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Ir para Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-white">
        <div className="max-w-md space-y-8">
          <BrandMark variant="light" size="lg" />
          
          <h2 className="text-4xl font-bold mb-4">
            Crie sua conta
          </h2>
          <p className="text-lg text-slate-300 mb-8">
            Junte-se à plataforma e tenha acesso às ferramentas de automação 
            integradas com Senior X.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-300">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <span>Notificações WhatsApp automatizadas</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <span>Integração com GED e Sign</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <span>Extensão para Cercas Virtuais</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-12 bg-slate-100">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/70 p-8">
            {/* Mobile branding */}
            <div className="lg:hidden flex items-center justify-center mb-6">
              <BrandMark variant="dark" size="md" />
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Criar Conta</h2>
              <p className="text-slate-500 mt-1">Preencha os dados abaixo</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nome completo"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Seu nome"
                icon={<User className="h-5 w-5" />}
                required
              />

              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="seu@email.com"
                icon={<Mail className="h-5 w-5" />}
                required
              />

              <Input
                label="Senha"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 8 caracteres"
                icon={<Lock className="h-5 w-5" />}
                required
              />

              <Input
                label="Confirmar senha"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Digite a senha novamente"
                icon={<Lock className="h-5 w-5" />}
                required
              />

              <Button type="submit" className="w-full" loading={loading}>
                Criar Conta
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link 
                to="/login" 
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
