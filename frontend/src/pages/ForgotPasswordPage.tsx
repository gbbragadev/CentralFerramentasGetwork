import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { apiClient } from '@/api/client';
import { Building2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Email é obrigatório');
      return;
    }

    setLoading(true);
    const response = await apiClient.post('/auth/forgot-password', { email });
    setLoading(false);

    if (response.error) {
      toast.error(response.error.message || 'Erro ao enviar email');
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Email Enviado!</h2>
            <p className="text-slate-600 mb-6">
              Se o email <strong>{email}</strong> estiver cadastrado, você receberá 
              um link para redefinir sua senha.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Verifique também sua caixa de spam.
            </p>
            <Link to="/login">
              <Button variant="secondary" className="w-full">
                Voltar para Login
              </Button>
            </Link>
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
            <h2 className="text-2xl font-bold text-slate-900">Esqueceu a senha?</h2>
            <p className="text-slate-500 mt-1">
              Digite seu email e enviaremos um link para redefinir sua senha.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              icon={<Mail className="h-5 w-5" />}
              required
            />

            <Button type="submit" className="w-full" loading={loading}>
              Enviar Link de Recuperação
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
