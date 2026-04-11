'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSuperAdminTenants, updateTenantSubscription } from '@/lib/api';
import {
  ShieldCheck, LogOut, RefreshCw, Users, Crown, AlertTriangle,
  CheckCircle, XCircle, Clock, Search, Pencil, X, Save,
} from 'lucide-react';

const planOptions = [
  { value: 'monthly',   label: 'Mensal',     days: 30  },
  { value: 'quarterly', label: 'Trimestral', days: 90  },
  { value: 'annual',    label: 'Anual',      days: 365 },
];

const statusOptions = [
  { value: 'trial',    label: 'Trial'     },
  { value: 'active',   label: 'Ativo'     },
  { value: 'past_due', label: 'Vencido'   },
  { value: 'blocked',  label: 'Bloqueado' },
];

const statusCfg: Record<string, { label: string; color: string; icon: any }> = {
  trial:    { label: 'Trial',     color: 'bg-blue-50 text-blue-700 border-blue-200',          icon: Clock },
  active:   { label: 'Ativo',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  past_due: { label: 'Vencido',   color: 'bg-amber-50 text-amber-700 border-amber-200',       icon: AlertTriangle },
  blocked:  { label: 'Bloqueado', color: 'bg-red-50 text-red-700 border-red-200',             icon: XCircle },
  'sem assinatura': { label: 'Sem plano', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: XCircle },
};

type FilterType = 'all' | 'active' | 'trial' | 'blocked' | 'past_due';

function formatDate(d: string | Date | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

// ── Modal de edição ──────────────────────────────────────────────────────────
function EditModal({ tenant, onClose }: { tenant: any; onClose: () => void }) {
  const qc = useQueryClient();
  const current = tenant.subscription;

  const [plan, setPlan]     = useState<string>(current?.plan ?? 'monthly');
  const [status, setStatus] = useState<string>(current?.status === 'blocked' || current?.isBlocked ? 'blocked' : (current?.status ?? 'trial'));
  const [days, setDays]     = useState<string>(
    planOptions.find((p) => p.value === (current?.plan ?? 'monthly'))?.days?.toString() ?? '30'
  );

  const mut = useMutation({
    mutationFn: () => updateTenantSubscription(tenant.id, {
      plan: plan as any,
      status: status as any,
      durationDays: Number(days),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sa-tenants'] });
      onClose();
    },
  });

  function handlePlanChange(p: string) {
    setPlan(p);
    const d = planOptions.find((o) => o.value === p)?.days;
    if (d) setDays(String(d));
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
      onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-md p-8 space-y-5 border border-gray-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-white text-lg">{tenant.name}</p>
            <p className="text-sm text-gray-400">{tenant.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <X size={22} />
          </button>
        </div>

        {/* Plano */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Plano</label>
          <div className="grid grid-cols-3 gap-3">
            {planOptions.map((p) => (
              <button key={p.value} onClick={() => handlePlanChange(p.value)}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-colors
                  ${plan === p.value
                    ? 'border-brand-500 bg-brand-500/20 text-brand-300'
                    : 'border-gray-600 text-gray-400 hover:border-gray-500'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Status</label>
          <div className="grid grid-cols-2 gap-3">
            {statusOptions.map((s) => (
              <button key={s.value} onClick={() => setStatus(s.value)}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-colors
                  ${status === s.value
                    ? 'border-brand-500 bg-brand-500/20 text-brand-300'
                    : 'border-gray-600 text-gray-400 hover:border-gray-500'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duração */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Duração (dias a partir de hoje)
          </label>
          <input
            type="number" min="1"
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors text-base"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
          <p className="text-sm text-gray-500 mt-1.5">
            Vencimento: {days ? formatDate(new Date(Date.now() + Number(days) * 86_400_000)) : '—'}
          </p>
        </div>

        {mut.isError && (
          <p className="text-red-400 text-sm">Erro ao salvar. Tente novamente.</p>
        )}

        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !days || Number(days) < 1}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-brand-500 to-brand-600 text-white font-semibold py-3.5 rounded-xl transition-all hover:opacity-90 disabled:opacity-50 text-base">
          <Save size={18} />
          {mut.isPending ? 'Salvando...' : 'Salvar assinatura'}
        </button>
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const router  = useRouter();
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<FilterType>('all');
  const [saUser, setSaUser]   = useState<any>(null);
  const [editing, setEditing] = useState<any | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('sa_token');
    const user  = localStorage.getItem('sa_user');
    if (!token) { router.push('/superadmin/login'); return; }
    if (user) setSaUser(JSON.parse(user));
  }, [router]);

  const { data: tenants = [], isLoading, refetch } = useQuery({
    queryKey: ['sa-tenants'],
    queryFn: async () => {
      const token = localStorage.getItem('sa_token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/superadmin/tenants`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error('Não autorizado');
      return res.json();
    },
    enabled: !!saUser,
  });

  function logout() {
    localStorage.removeItem('sa_token');
    localStorage.removeItem('sa_user');
    router.push('/superadmin/login');
  }

  const total    = (tenants as any[]).length;
  const active   = (tenants as any[]).filter((t) => t.subscription?.status === 'active').length;
  const trial    = (tenants as any[]).filter((t) => t.subscription?.status === 'trial').length;
  const blocked  = (tenants as any[]).filter((t) => t.subscription?.isBlocked).length;
  const past_due = (tenants as any[]).filter((t) => t.subscription?.status === 'past_due' && !t.subscription?.isBlocked).length;
  const expiring = (tenants as any[]).filter((t) => {
    const d = t.subscription?.daysUntilExpiry;
    return d !== null && d !== undefined && d <= 10 && !t.subscription?.isBlocked;
  }).length;

  const filtered = (tenants as any[]).filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.document?.includes(search);

    const sub = t.subscription;
    const matchFilter =
      filter === 'all'     ? true :
      filter === 'active'  ? sub?.status === 'active' && !sub?.isBlocked :
      filter === 'trial'   ? sub?.status === 'trial' && !sub?.isBlocked :
      filter === 'blocked' ? sub?.isBlocked :
      filter === 'past_due'? sub?.status === 'past_due' && !sub?.isBlocked :
      true;

    return matchSearch && matchFilter;
  });

  const planLabel: Record<string, string> = { monthly: 'Mensal', quarterly: 'Trimestral', annual: 'Anual' };

  const filterTabs: { value: FilterType; label: string; count: number; color: string }[] = [
    { value: 'all',      label: 'Todos',      count: total,    color: 'text-white' },
    { value: 'active',   label: 'Ativos',     count: active,   color: 'text-emerald-400' },
    { value: 'trial',    label: 'Trial',      count: trial,    color: 'text-blue-400' },
    { value: 'past_due', label: 'Vencidos',   count: past_due, color: 'text-amber-400' },
    { value: 'blocked',  label: 'Bloqueados', count: blocked,  color: 'text-red-400' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-lg">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-base text-white">Super Admin</p>
            <p className="text-sm text-gray-400">{saUser?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => refetch()} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg">
            <RefreshCw size={20} />
          </button>
          <button onClick={logout} className="text-gray-400 hover:text-red-400 transition-colors p-2 hover:bg-gray-700 rounded-lg">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold">Marmitarias cadastradas</h1>

        {/* Totais */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total',      value: total,    color: 'text-white',       icon: Users },
            { label: 'Ativos',     value: active,   color: 'text-emerald-400', icon: CheckCircle },
            { label: 'Trial',      value: trial,    color: 'text-blue-400',    icon: Clock },
            { label: 'Bloqueados', value: blocked,  color: 'text-red-400',     icon: XCircle },
          ].map((s) => (
            <div key={s.label} className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
              <s.icon size={18} className={`${s.color} mb-2`} />
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {expiring > 0 && (
          <div className="flex items-center gap-3 bg-amber-900/30 border border-amber-700 rounded-xl px-5 py-4 text-amber-300 text-sm">
            <AlertTriangle size={18} className="shrink-0" />
            <span><strong>{expiring} marmitaria{expiring > 1 ? 's' : ''}</strong> com assinatura vencendo nos próximos 10 dias</span>
          </div>
        )}

        {/* Busca + Filtros */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors text-base"
              placeholder="Buscar por nome, email ou documento..."
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filtro por status */}
          <div className="flex gap-2 flex-wrap">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors
                  ${filter === tab.value
                    ? 'border-brand-500 bg-brand-500/20 text-brand-300'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300 bg-gray-800'}`}>
                <span className={filter === tab.value ? 'text-brand-300' : tab.color}>{tab.count}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-2xl h-28 animate-pulse border border-gray-700" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="bg-gray-800 rounded-2xl p-12 text-center text-gray-500 border border-gray-700 text-base">
                Nenhuma marmitaria encontrada
              </div>
            )}
            {filtered.map((t: any) => {
              const sub  = t.subscription;
              const cfg  = statusCfg[sub?.status ?? 'sem assinatura'] ?? statusCfg['sem assinatura'];
              const Icon = cfg.icon;
              const warn = sub && !sub.isBlocked && sub.daysUntilExpiry !== null && sub.daysUntilExpiry <= 10;

              return (
                <div key={t.id} className={`bg-gray-800 rounded-2xl p-5 border transition-colors
                  ${sub?.isBlocked ? 'border-red-800' : warn ? 'border-amber-800' : 'border-gray-700'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <p className="font-semibold text-white text-base">{t.name}</p>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                          <Icon size={12} /> {cfg.label}
                        </span>
                        {warn && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-900/40 text-amber-400 border border-amber-700">
                            <AlertTriangle size={12} /> {sub.daysUntilExpiry}d
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{t.email}</p>
                      {t.document && <p className="text-sm text-gray-500 font-mono mt-0.5">{t.document}</p>}
                    </div>
                    <div className="flex items-start gap-3 flex-shrink-0">
                      <div className="text-right">
                        {sub ? (
                          <>
                            <div className="flex items-center gap-1.5 justify-end text-gray-300 text-sm">
                              <Crown size={13} className="text-brand-400" />
                              {planLabel[sub.plan] ?? sub.plan}
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {sub.isBlocked ? (
                                <span className="text-red-400">Bloqueado</span>
                              ) : sub.expiresAt ? (
                                <>Vence: <span className={sub.daysUntilExpiry <= 10 ? 'text-amber-400' : 'text-gray-400'}>
                                  {formatDate(sub.expiresAt)}
                                </span></>
                              ) : '—'}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">Sem assinatura</p>
                        )}
                      </div>
                      <button
                        onClick={() => setEditing(t)}
                        className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-700 hover:bg-brand-500/20 hover:text-brand-400 text-gray-400 transition-colors mt-0.5 flex-shrink-0">
                        <Pencil size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-700 flex items-center gap-5 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5"><Users size={13} /> {t.customersCount} clientes</span>
                    <span className="flex items-center gap-1.5">🍱 {t.mealsCount} marmitas</span>
                    <span className="ml-auto">Cadastrado {formatDate(t.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && <EditModal tenant={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
