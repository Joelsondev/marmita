'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { loginClient, getClientTenants } from '@/lib/api';
import { setAuth } from '@/lib/auth';
import { AlertCircle, ChevronRight, Building2 } from 'lucide-react';

function formatCPF(value: string) {
  return value.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
}

type Tenant = { id: string; name: string; slug: string };

export default function ClientLoginPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep]           = useState<'cpf' | 'tenant'>('cpf');
  const [cpf, setCpf]             = useState('');
  const [tenants, setTenants]     = useState<Tenant[]>([]);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  async function handleCpfSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const raw  = cpf.replace(/\D/g, '');
      const list: Tenant[] = await getClientTenants(raw);
      if (list.length === 0) {
        setError('CPF não encontrado em nenhuma marmitaria. Fale com sua marmitaria.');
        return;
      }
      setTenants(list);
      if (list.length === 1) {
        await doLogin(raw, list[0]);
      } else {
        setStep('tenant');
      }
    } catch {
      setError('Erro ao buscar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTenantSelect(tenant: Tenant) {
    setError('');
    setLoading(true);
    try {
      await doLogin(cpf.replace(/\D/g, ''), tenant);
    } catch {
      setError('Erro ao entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function doLogin(rawCpf: string, tenant: Tenant) {
    const data = await loginClient(rawCpf, tenant.id);
    setAuth(data.token, { ...data.customer, role: 'customer', tenantId: tenant.id });
    qc.clear();
    router.push('/cliente/home');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🍱</div>
        <h1 className="text-2xl font-bold">Área do Cliente</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {step === 'cpf' ? 'Digite seu CPF para entrar' : 'Selecione sua marmitaria'}
        </p>
      </div>

      <div className="card max-w-sm mx-auto w-full">
        {step === 'cpf' && (
          <form onSubmit={handleCpfSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-200">
                <AlertCircle size={15} className="shrink-0" /> {error}
              </div>
            )}
            <div>
              <label className="label">CPF</label>
              <input
                className="input text-xl tracking-widest text-center font-mono"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                inputMode="numeric"
                autoFocus
                required
              />
            </div>
            <button type="submit" className="btn-primary"
              disabled={loading || cpf.replace(/\D/g, '').length < 11}>
              {loading ? 'Buscando...' : 'Continuar'}
            </button>
          </form>
        )}

        {step === 'tenant' && (
          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-200">
                <AlertCircle size={15} className="shrink-0" /> {error}
              </div>
            )}
            <p className="text-xs text-gray-400 text-center uppercase tracking-wide font-medium">
              {tenants.length} marmitaria{tenants.length > 1 ? 's' : ''} encontrada{tenants.length > 1 ? 's' : ''}
            </p>
            <div className="space-y-2">
              {tenants.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTenantSelect(t)}
                  disabled={loading}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-gray-100
                             hover:border-brand-400 hover:bg-brand-50 transition-colors text-left group disabled:opacity-50">
                  <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
                    <Building2 size={17} className="text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.slug}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-400 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
            <button type="button" className="btn-secondary"
              onClick={() => { setStep('cpf'); setError(''); }}>
              Usar outro CPF
            </button>
          </div>
        )}
      </div>

      <div className="text-center mt-6">
        <Link href="/" className="text-gray-400 text-sm">← Voltar</Link>
      </div>
    </div>
  );
}
