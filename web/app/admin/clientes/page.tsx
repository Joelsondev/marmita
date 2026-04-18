'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomers, createCustomer, addCredit, unblockCustomer } from '@/lib/api';
import { formatCurrency } from '@/lib/cart';
import { Plus, CreditCard, X, AlertCircle, AlertTriangle, Unlock } from 'lucide-react';

function formatCPF(value: string) {
  return value.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
}
function formatPhone(value: string) {
  return value.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15);
}

export default function ClientesPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew]           = useState(false);
  const [showCredit, setShowCredit]     = useState<string | null>(null);
  const [showUnblock, setShowUnblock]   = useState<string | null>(null);
  const [search, setSearch]             = useState('');
  const [form, setForm]                 = useState({ name: '', cpf: '', phone: '' });
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDesc, setCreditDesc]     = useState('');
  const [createError, setCreateError]   = useState('');

  const { data: customers = [], isLoading } = useQuery({ queryKey: ['customers'], queryFn: getCustomers });

  const createMut = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setShowNew(false);
      setForm({ name: '', cpf: '', phone: '' });
      setCreateError('');
    },
    onError: (e: any) => setCreateError(e.response?.data?.message || 'Erro ao criar cliente'),
  });

  const creditMut = useMutation({
    mutationFn: ({ id, data }: any) => addCredit(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setShowCredit(null);
      setCreditAmount('');
      setCreditDesc('');
    },
  });

  const unblockMut = useMutation({
    mutationFn: (id: string) => unblockCustomer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setShowUnblock(null);
    },
  });

  const filtered = customers.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.cpf.includes(search.replace(/\D/g, ''))
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Clientes</h1>
        <button
          onClick={() => { setShowNew(true); setCreateError(''); }}
          className="bg-gradient-to-br from-brand-500 to-brand-600 text-white p-2 rounded-xl hover:shadow-brand transition-all">
          <Plus size={20} />
        </button>
      </div>

      <input className="input" placeholder="Buscar por nome ou CPF..."
        value={search} onChange={(e) => setSearch(e.target.value)} />

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c: any) => (
            <div key={c.id} className={`card ${Number(c.balance) < 0 ? 'border-red-200 bg-red-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{c.name}</p>
                    {c.isBlocked && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                        BLOQUEADO
                      </span>
                    )}
                    {Number(c.balance) < 0 && !c.isBlocked && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        SALDO NEGATIVO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 font-mono">{formatCPF(c.cpf)}</p>
                  <p className={`text-sm font-bold ${Number(c.balance) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(Number(c.balance))}
                  </p>
                  {c.isBlocked && (
                    <p className="text-xs text-red-600 mt-1">
                      {c.noShowCount} não-retirada(s) • {c.lastNoShowAt ? new Date(c.lastNoShowAt).toLocaleDateString() : ''}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {c.isBlocked ? (
                    <button
                      onClick={() => setShowUnblock(c.id)}
                      className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                      <Unlock size={16} /> Desbloquear
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowCredit(c.id)}
                      className="flex items-center gap-1 bg-brand-50 text-brand-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-brand-100 transition-colors">
                      <CreditCard size={16} /> Crédito
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-gray-400 py-6">Nenhum cliente encontrado</p>}
        </div>
      )}

      {/* Modal: Novo Cliente */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-t-2xl w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Novo Cliente</h2>
              <button onClick={() => setShowNew(false)}><X size={20} /></button>
            </div>
            {createError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm">
                <AlertCircle size={14} className="shrink-0" /> {createError}
              </div>
            )}
            <div>
              <label className="label">Nome</label>
              <input className="input" placeholder="Nome completo" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">CPF <span className="text-red-400">*</span></label>
              <input className="input font-mono tracking-wider" placeholder="000.000.000-00" inputMode="numeric" required
                value={formatCPF(form.cpf)}
                onChange={(e) => setForm({ ...form, cpf: e.target.value.replace(/\D/g, '') })} />
            </div>
            <div>
              <label className="label">Telefone (opcional)</label>
              <input className="input" placeholder="(11) 99999-9999" inputMode="numeric"
                value={form.phone ? formatPhone(form.phone) : ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} />
            </div>
            <button className="btn-primary"
              disabled={createMut.isPending || !form.name || form.cpf.length < 11}
              onClick={() => createMut.mutate({ name: form.name, cpf: form.cpf, phone: form.phone || undefined })}>
              {createMut.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Crédito */}
      {showCredit && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowCredit(null)}>
          <div className="bg-white rounded-t-2xl w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Adicionar Crédito</h2>
              <button onClick={() => setShowCredit(null)}><X size={20} /></button>
            </div>
            <div>
              <label className="label">Valor (R$)</label>
              <input className="input text-2xl" type="number" step="0.01" min="0.01" placeholder="0,00"
                value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} />
            </div>
            <div>
              <label className="label">Descrição (opcional)</label>
              <input className="input" placeholder="Ex: Recarga semanal" value={creditDesc}
                onChange={(e) => setCreditDesc(e.target.value)} />
            </div>
            <button className="btn-primary"
              disabled={creditMut.isPending || !creditAmount}
              onClick={() => creditMut.mutate({ id: showCredit, data: { amount: parseFloat(creditAmount), description: creditDesc } })}>
              {creditMut.isPending ? 'Adicionando...' : `Adicionar R$ ${parseFloat(creditAmount || '0').toFixed(2)}`}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Desbloquear Cliente */}
      {showUnblock && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowUnblock(null)}>
          <div className="bg-white rounded-t-2xl w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Desbloquear Cliente</h2>
              <button onClick={() => setShowUnblock(null)}><X size={20} /></button>
            </div>
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-semibold">Desbloquear este cliente?</p>
                <p className="mt-1 text-red-600">O contador de não-retiradas será resetado a zero.</p>
              </div>
            </div>
            <button className="btn-primary w-full"
              disabled={unblockMut.isPending}
              onClick={() => unblockMut.mutate(showUnblock)}>
              {unblockMut.isPending ? 'Desbloqueando...' : 'Confirmar Desbloquear'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
