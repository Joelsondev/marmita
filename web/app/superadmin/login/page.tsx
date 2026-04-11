'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginSuperAdmin } from '@/lib/api';
import { AlertCircle, ShieldCheck } from 'lucide-react';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginSuperAdmin(form.email, form.password);
      localStorage.setItem('sa_token', data.token);
      localStorage.setItem('sa_user', JSON.stringify(data.superAdmin));
      router.push('/superadmin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center px-6">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-brand">
          <ShieldCheck size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Super Admin</h1>
        <p className="text-gray-400 mt-1 text-sm">Painel de gestão da plataforma</p>
      </div>

      <div className="bg-gray-800 rounded-2xl p-6 max-w-sm mx-auto w-full border border-gray-700">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-xl text-sm">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input type="email" className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
              placeholder="super@marmita.app"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
            <input type="password" className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
              placeholder="••••••••"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-br from-brand-500 to-brand-600 text-white font-semibold py-3 rounded-xl transition-all hover:shadow-brand disabled:opacity-50">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
