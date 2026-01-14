import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Building2 } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center mb-8">
            <Building2 className="h-10 w-10 text-primary mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Forbiz & GetWork</h1>
              <p className="text-sm text-slate-600">Central de Ferramentas</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-md font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-600 mt-6">
          © 2024 Forbiz & GetWork. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
