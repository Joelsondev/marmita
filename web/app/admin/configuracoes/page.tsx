'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDiscountRule, upsertDiscountRule, getSubscription, activateSubscription, createRegistrationLink, getRegistrationLinks } from '@/lib/api';
import { Save, Clock, Percent, CheckCircle, Crown, Calendar, AlertTriangle, Lock, Link2, Copy, Check, Plus } from 'lucide-react';

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
  const [form, setForm]     = useState({ cutoffTime: '10:00', discountValue: '', maxNoShowsBeforeBlock: 3 });
  const [saved, setSaved]   = useState(false);
  const [origin, setOrigin] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const { data: rule }   = useQuery({ queryKey: ['discount-rule'], queryFn: getDiscountRule });
  const { data: sub }    = useQuery({ queryKey: ['subscription'],  queryFn: getSubscription });
  const { data: links }  = useQuery({ queryKey: ['registration-links'], queryFn: getRegistrationLinks });

  const createLinkMut = useMutation({
    mutationFn: createRegistrationLink,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['registration-links'] }),
  });

  function handleCopyLink(code: string) {
    const link = `${origin}/cadastro/${code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    });
  }

  const isActive = sub?.status === 'active' && !sub?.isBlocked;

  useEffect(() => {
    if (rule) setForm({ cutoffTime: rule.cutoffTime, discountValue: String(rule.discountValue), maxNoShowsBeforeBlock: rule.maxNoShowsBeforeBlock || 3 });
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

      {/* ── Política de Não-Retirada ── */}
      <div className={`card space-y-4 transition-opacity ${!isActive ? 'opacity-50 pointer-events-none' : ''}`}>
        <h2 className="font-semibold text-gray-700">Política de Não-Retirada</h2>
        <p className="text-sm text-gray-400">
          Clientes que não retiram seus pedidos ficarão bloqueados automaticamente. Defina quantas não-retiradas antes do bloqueio.
        </p>

        <div>
          <label className="label">Máximo de não-retiradas antes de bloquear</label>
          <input type="number" className="input" placeholder="3" min="1" max="10"
            value={form.maxNoShowsBeforeBlock}
            onChange={(e) => setForm({ ...form, maxNoShowsBeforeBlock: parseInt(e.target.value) || 3 })}
            disabled={!isActive} />
          <p className="text-xs text-gray-400 mt-1">
            {form.maxNoShowsBeforeBlock === 1
              ? '1 não-retirada no mesmo dia'
              : `${form.maxNoShowsBeforeBlock} não-retiradas no mesmo dia`}
          </p>
        </div>

        {rule && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
            Configuração atual: máximo de <strong>{rule.maxNoShowsBeforeBlock || 3} não-retirada(s)</strong> antes de bloqueio
          </div>
        )}
      </div>

      {/* ── Links de Cadastro ── */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 size={18} className="text-brand-500" />
            <h2 className="font-semibold text-gray-700">Links de Cadastro</h2>
          </div>
          <button
            onClick={() => createLinkMut.mutate()}
            disabled={createLinkMut.isPending}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors disabled:opacity-50">
            <Plus size={14} />
            {createLinkMut.isPending ? 'Gerando...' : 'Novo link'}
          </button>
        </div>

        <p className="text-sm text-gray-400">
          Compartilhe um link para seus clientes. Cada código é único e só funciona para sua marmitaria.
        </p>

        {links && links.length > 0 ? (
          <div className="space-y-2">
            {links.map((link: any) => (
              <div key={link.code} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 group hover:border-brand-300 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono font-semibold text-gray-900">{link.code}</p>
                  <p className="text-xs text-gray-400 truncate">{origin}/cadastro/{link.code}</p>
                  {!link.active && <p className="text-xs text-red-600 font-medium">Desativado</p>}
                </div>
                <button
                  onClick={() => handleCopyLink(link.code)}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
                  {copiedCode === link.code ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {copiedCode === link.code ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">Nenhum link de cadastro criado ainda</p>
        )}
      </div>

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
                disabled={activateMut.isPending || sub?.status === 'active'}
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
      <div className={`card space-y-4 transition-opacity ${!isActive ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Regra de Desconto</h2>
          {!isActive && (
            <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">
              Desativado
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400">
          Pedidos feitos antes do horário limite recebem o desconto configurado.
        </p>

        <div>
          <label className="label flex items-center gap-1"><Clock size={14} /> Horário limite</label>
          <input type="time" className="input" value={form.cutoffTime}
            onChange={(e) => setForm({ ...form, cutoffTime: e.target.value })}
            disabled={!isActive} />
        </div>

        <div>
          <label className="label flex items-center gap-1"><Percent size={14} /> Desconto (%)</label>
          <input type="number" className="input" placeholder="Ex: 10" min="0" max="100"
            value={form.discountValue}
            onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
            disabled={!isActive} />
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
      </div>

      {/* ── Botão Salvar (Final) ── */}
      <button className="btn-primary flex items-center justify-center gap-2 w-full" disabled={saveMut.isPending || !isActive}
        onClick={() => saveMut.mutate({
          cutoffTime: form.cutoffTime,
          discountValue: parseFloat(form.discountValue),
          maxNoShowsBeforeBlock: form.maxNoShowsBeforeBlock
        })}>
        <Save size={18} />
        {saveMut.isPending ? 'Salvando...' : 'Salvar todas as configurações'}
      </button>
    </div>
  );
}
