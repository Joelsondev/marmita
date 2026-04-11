'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginAdmin } from '@/lib/api';
import { setAuth } from '@/lib/auth';
import { AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginAdmin(form.email, form.password);
      setAuth(data.token, { ...data.admin, role: 'admin' });
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🍱</div>
        <h1 className="text-2xl font-bold text-gray-900">Área da Marmitaria</h1>
        <p className="text-gray-500 mt-1">Faça login para gerenciar seus pedidos</p>
      </div>

      <div className="card max-w-sm mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" placeholder="seu@email.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoFocus />
          </div>
          <div>
            <label className="label">Senha</label>
            <input type="password" className="input" placeholder="••••••••"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Não tem conta?{' '}
          <Link href="/registro" className="text-brand-500 font-medium hover:text-brand-600">Cadastre-se</Link>
        </p>
      </div>

      <div className="text-center mt-6">
        <Link href="/" className="text-gray-400 text-sm">← Voltar</Link>
      </div>
    </div>
  );
}
