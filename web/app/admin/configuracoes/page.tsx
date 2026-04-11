'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDiscountRule, upsertDiscountRule, getSubscription, activateSubscription } from '@/lib/api';
import { Save, Clock, Percent, CheckCircle, Crown, Calendar, AlertTriangle, Lock } from 'lucide-react';

const plans = [
  { key: 'monthly',   label: 'Mensal',      price: 'R$ 49,90/mês',    total: 'R$ 49,90',   savings: '' },
  { key: 'quarterly', label: 'Trimestral',  price: 'R$ 39,90/mês',    total: 'R$ 119,70',  savings: 'Economize 20%' },
  { key: 'annual',    label: 'Anual',       price: 'R$ 29,90/mês',    total: 'R$ 358,80',  savings: 'Economize 40%' },
] as const;

const statusLabel: Record<string, string> = {
  trial:    'Trial gratuito',
  active:   'Ativa',
  past_due: 'Vencida',
  blocked:  'Bloqueada',
};

const statusColor: Record<string, string> = {
  trial:    'text-blue-600 bg-blue-50 border-blue-200',
  active:   'text-emerald-600 bg-emerald-50 border-emerald-200',
  past_due: 'text-amber-600 bg-amber-50 border-amber-200',
  blocked:  'text-red-600 bg-red-50 border-red-200',
};

export default function ConfiguracoesPage() {
  const qc = useQueryClient();
  const [form, setForm]   = useState({ cutoffTime: '10:00', discountValue: '' });
  const [saved, setSaved] = useState(false);

  const { data: rule } = useQuery({ queryKey: ['discount-rule'], queryFn: getDiscountRule });
  const { data: sub }  = useQuery({ queryKey: ['subscription'],  queryFn: getSubscription });

  useEffect(() => {
    if (rule) setForm({ cutoffTime: rule.cutoffTime, discountValue: String(rule.discountValue) });
  }, [rule]);

  const saveMut = useMutation({
    mutationFn: upsertDiscountRule,
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2500); },
  });

  const activateMut = useMutation({
    mutationFn: activateSubscription,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscription'] }),
  });

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Configurações</h1>

      {/* ── Assinatura ── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Crown size={18} className="text-brand-500" />
          <h2 className="font-semibold text-gray-700">Assinatura</h2>
        </div>

        {sub && (
          <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${statusColor[sub.status] || statusColor.trial}`}>
            <div>
              <p className="font-semibold text-sm">
                {statusLabel[sub.status] || 'Trial'} — {sub.plan === 'monthly' ? 'Mensal' : sub.plan === 'quarterly' ? 'Trimestral' : sub.plan === 'annual' ? 'Anual' : 'Trial'}
              </p>
              {sub.status === 'trial' && sub.trialEndsAt && (
                <p className="text-xs mt-0.5 opacity-75">
                  {sub.isBlocked ? 'Trial encerrado' : `Expira em ${sub.daysUntilExpiry} dia${sub.daysUntilExpiry !== 1 ? 's' : ''}`}
                </p>
              )}
              {sub.status !== 'trial' && sub.currentPeriodEnd && (
                <p className="text-xs mt-0.5 opacity-75 flex items-center gap-1">
                  <Calendar size={11} />
                  {sub.isBlocked ? 'Acesso bloqueado' : `Vence em ${sub.daysUntilExpiry} dia${sub.daysUntilExpiry !== 1 ? 's' : ''}`}
                </p>
              )}
            </div>
            {(sub.isBlocked || sub.alertDaysLeft !== null) && (
              sub.isBlocked
                ? <Lock size={18} />
                : <AlertTriangle size={18} />
            )}
          </div>
        )}

        <p className="text-sm text-gray-500">Escolha ou renove seu plano:</p>

        <div className="space-y-2">
          {plans.map((plan) => {
            const isCurrent = sub?.plan === plan.key && sub?.status === 'active';
            return (
              <button
                key={plan.key}
                onClick={() => activateMut.mutate(plan.key)}
                disabled={activateMut.isPending}
                className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-colors text-left
                  ${isCurrent
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-gray-100 hover:border-brand-300 hover:bg-brand-50/50'}`}>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{plan.label}</p>
                  <p className="text-xs text-gray-400">{plan.price}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-700 text-sm">{plan.total}</p>
                  {plan.savings && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                      {plan.savings}
                    </span>
                  )}
                  {isCurrent && <span className="text-xs text-brand-500 font-semibold block">Plano atual</span>}
                </div>
              </button>
            );
          })}
        </div>

        {activateMut.isSuccess && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
            <CheckCircle size={15} /> Plano ativado com sucesso!
          </div>
        )}
      </div>

      {/* ── Desconto ── */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700">Regra de Desconto</h2>
        <p className="text-sm text-gray-400">
          Pedidos feitos antes do horário limite recebem o desconto configurado.
        </p>

        <div>
          <label className="label flex items-center gap-1"><Clock size={14} /> Horário limite</label>
          <input type="time" className="input" value={form.cutoffTime}
            onChange={(e) => setForm({ ...form, cutoffTime: e.target.value })} />
        </div>

        <div>
          <label className="label flex items-center gap-1"><Percent size={14} /> Desconto (%)</label>
          <input type="number" className="input" placeholder="Ex: 10" min="0" max="100"
            value={form.discountValue}
            onChange={(e) => setForm({ ...form, discountValue: e.target.value })} />
        </div>

        {rule && (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 text-sm text-brand-700">
            Configuração atual: <strong>{rule.discountValue}% de desconto</strong> para pedidos até <strong>{rule.cutoffTime}</strong>
          </div>
        )}

        {saved && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
            <CheckCircle size={15} /> Configuração salva com sucesso!
          </div>
        )}

        <button className="btn-primary flex items-center justify-center gap-2" disabled={saveMut.isPending}
          onClick={() => saveMut.mutate({ cutoffTime: form.cutoffTime, discountValue: parseFloat(form.discountValue) })}>
          <Save size={18} />
          {saveMut.isPending ? 'Salvando...' : 'Salvar configuração'}
        </button>
      </div>
    </div>
  );
}
