'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { validateRegistrationCode, selfRegisterCustomer } from '@/lib/api';
import { setAuth } from '@/lib/auth';
import { AlertCircle, Store } from 'lucide-react';

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10)
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

export default function CadastroClientePage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  const [tenant, setTenant] = useState<{ name: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({ name: '', cpf: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!code) return;
    validateRegistrationCode(code)
      .then((data) => setTenant(data.tenant))
      .catch(() => setNotFound(true));
  }, [code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await selfRegisterCustomer({
        registrationLinkCode: code,
        name: form.name,
        cpf: form.cpf.replace(/\D/g, ''),
        phone: form.phone.replace(/\D/g, ''),
      });
      setAuth(data.token, { ...data.customer, role: 'customer' });
      router.push('/cliente/home');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao realizar cadastro');
    } finally {
      setLoading(false);
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">404</div>
        <h1 className="text-xl font-bold text-gray-900">Link de cadastro inválido</h1>
        <p className="text-gray-500 mt-2 text-sm">Este link expirou ou não existe mais.</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-8">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🍱</div>
        <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-4 py-1.5 mb-3">
          <Store size={14} className="text-brand-500" />
          <span className="text-sm font-medium text-brand-700">{tenant.name}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Criar minha conta</h1>
        <p className="text-gray-500 mt-1 text-sm">Preencha seus dados para fazer pedidos</p>
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
            <label className="label">Nome completo</label>
            <input
              className="input"
              placeholder="João da Silva"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">CPF</label>
            <input
              className="input"
              placeholder="000.000.000-00"
              inputMode="numeric"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: formatCpf(e.target.value) })}
              required
            />
          </div>

          <div>
            <label className="label">Telefone</label>
            <input
              className="input"
              placeholder="(00) 90000-0000"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Cadastrando...' : 'Criar conta e fazer pedido'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Já tem cadastro?{' '}
          <a href="/login" className="text-brand-500 font-medium hover:text-brand-600">Entrar com CPF</a>
        </p>
      </div>
    </div>
  );
}
