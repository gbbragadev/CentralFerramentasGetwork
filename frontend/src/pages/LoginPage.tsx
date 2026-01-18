import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Loader2, AlertCircle, Lock, Mail, CheckCircle } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate('/tenants');
    } else {
      setError(result.error || 'Erro ao fazer login');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left Panel - Branding (fundo escuro = logo azul/dark) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 items-center justify-center p-12">
        <div className="max-w-md text-white space-y-8">
          {/* Logo azul para fundo escuro */}
          <img 
            src="/logo-dark.png" 
            alt="Forbiz & GetWork" 
            className="h-24 w-auto object-contain"
          />
          
          <h2 className="text-2xl font-semibold mb-4">
            Gerencie suas integrações com Senior X
          </h2>
          
          <p className="text-white/70 leading-relaxed mb-8">
            Plataforma centralizada para gerenciamento de tenants, notificações WhatsApp, 
            e integração com GED, Sign e HCM.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-white/90">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <span>Notificações WhatsApp automatizadas</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <span>Integração com GED e Sign</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <span>Extensão para Cercas Virtuais</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <span>Multi-tenant com isolamento</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form (fundo claro = logo light) */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-100">
        <div className="w-full max-w-md">
          {/* Mobile Logo - fundo claro */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <img 
              src="/logo-light.png" 
              alt="Forbiz & GetWork" 
              className="h-16 w-auto object-contain"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/70 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Bem-vindo de volta</h2>
              <p className="text-slate-600 mt-1">Entre com suas credenciais para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-sm bg-white"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Senha
                  </label>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-primary hover:text-primary/80 font-medium"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-sm bg-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Não tem uma conta?{' '}
                <Link 
                  to="/register" 
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  Criar conta
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500 mt-8">
            © 2026 Forbiz & GetWork. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
