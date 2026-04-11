'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerTenant } from '@/lib/api';
import { setAuth } from '@/lib/auth';
import { AlertCircle } from 'lucide-react';

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', slug: '', document: '', adminName: '', email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await registerTenant(form);
      setAuth(data.token, { ...data.admin, role: 'admin' });
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-8">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🍱</div>
        <h1 className="text-2xl font-bold">Cadastre sua Marmitaria</h1>
        <p className="text-gray-500 mt-1 text-sm">Crie sua conta e comece a vender</p>
      </div>

      <div className="card max-w-sm mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="label">Nome da Marmitaria</label>
            <input className="input" placeholder="Marmitas da Maria"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Identificador (slug)</label>
            <input className="input" placeholder="marmitas-da-maria"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              required />
            <p className="text-xs text-gray-400 mt-1">Usado para identificar sua marmitaria</p>
          </div>
          <div>
            <label className="label">CNPJ ou CPF <span className="text-red-400">*</span></label>
            <input className="input" placeholder="00.000.000/0001-00 ou 000.000.000-00"
              value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} required />
            <p className="text-xs text-gray-400 mt-1">CNPJ para empresas · CPF para pessoa física</p>
          </div>
          <div>
            <label className="label">Seu nome</label>
            <input className="input" placeholder="Maria Silva"
              value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" placeholder="maria@email.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="label">Senha</label>
            <input type="password" className="input" placeholder="Mínimo 6 caracteres"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              required minLength={6} />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Cadastrando...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Já tem conta?{' '}
          <Link href="/admin/login" className="text-brand-500 font-medium hover:text-brand-600">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
