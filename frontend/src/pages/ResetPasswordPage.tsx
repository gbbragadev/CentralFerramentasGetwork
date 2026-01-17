import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { apiClient } from '@/api/client';
import { Building2, Lock, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Token de recuperação não encontrado');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('Token de recuperação inválido');
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
    const response = await apiClient.post('/auth/reset-password', {
      token,
      newPassword: formData.password,
    });
    setLoading(false);

    if (response.error) {
      toast.error(response.error.message || 'Erro ao redefinir senha');
    } else {
      setSuccess(true);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Link Inválido</h2>
            <p className="text-slate-600 mb-6">
              O link de recuperação de senha é inválido ou expirou.
            </p>
            <Link to="/forgot-password">
              <Button className="w-full">
                Solicitar Novo Link
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Senha Redefinida!</h2>
            <p className="text-slate-600 mb-6">
              Sua senha foi alterada com sucesso. Você já pode fazer login com a nova senha.
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Branding */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Forbiz & GetWork</h1>
              <p className="text-xs text-slate-500">Central de Ferramentas</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Nova Senha</h2>
            <p className="text-slate-500 mt-1">
              Digite sua nova senha abaixo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nova senha"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Mínimo 8 caracteres"
              icon={<Lock className="h-5 w-5" />}
              required
            />

            <Input
              label="Confirmar nova senha"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Digite a senha novamente"
              icon={<Lock className="h-5 w-5" />}
              required
            />

            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
              <p className="font-medium mb-1">Requisitos da senha:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Mínimo de 8 caracteres</li>
                <li>Recomendado: letras, números e símbolos</li>
              </ul>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Redefinir Senha
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
  );
}
