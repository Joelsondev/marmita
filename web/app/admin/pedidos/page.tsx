'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrders, approveOrder, cancelOrder } from '@/lib/api';
import { formatCurrency } from '@/lib/cart';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const statusLabel: Record<string, string> = {
  PENDING:   'Pendente',
  CONFIRMED: 'Sem saldo',
  PICKED_UP: 'Retirado',
  CANCELLED: 'Cancelado',
};

function formatCPF(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
}

export default function PedidosPage() {
  const qc = useQueryClient();
  const [date, setDate]             = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter]         = useState<'all' | 'pending' | 'problem'>('all');

  const approveMut = useMutation({
    mutationFn: approveOrder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders', date] }),
  });
  const cancelMut = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders', date] }),
  });

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ['orders', date],
    queryFn: () => getOrders(date),
    refetchInterval: 30_000,
  });

  const orders =
    filter === 'problem' ? (allOrders as any[]).filter((o) => o.status === 'CONFIRMED') :
    filter === 'pending' ? (allOrders as any[]).filter((o) => o.status === 'PENDING') :
    (allOrders as any[]);

  const pendingCount = (allOrders as any[]).filter((o) => o.status === 'PENDING').length;
  const problemCount = (allOrders as any[]).filter((o) => o.status === 'CONFIRMED').length;
  const doneCount    = (allOrders as any[]).filter((o) => o.status === 'PICKED_UP').length;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Pedidos</h1>

      <div className="flex items-center gap-3">
        <input type="date" className="input flex-1" value={date} onChange={(e) => setDate(e.target.value)} />
        <span className="text-sm text-gray-400">{(allOrders as any[]).length} pedidos</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="card py-3">
          <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
          <p className="text-xs text-gray-400">Pendentes</p>
        </div>
        <div className="card py-3">
          <p className="text-2xl font-bold text-red-500">{problemCount}</p>
          <p className="text-xs text-gray-400">Sem saldo</p>
        </div>
        <div className="card py-3">
          <p className="text-2xl font-bold text-emerald-500">{doneCount}</p>
          <p className="text-xs text-gray-400">Retirados</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <button onClick={() => setFilter('all')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors
            ${filter === 'all' ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
          Todos
        </button>
        <button onClick={() => setFilter('pending')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors
            ${filter === 'pending' ? 'bg-amber-500 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
          Pendentes {pendingCount > 0 && `(${pendingCount})`}
        </button>
        <button onClick={() => setFilter('problem')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors
            ${filter === 'problem' ? 'bg-red-500 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
          Problema {problemCount > 0 && `(${problemCount})`}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-2">
          {orders.length === 0 && (
            <p className="text-center text-gray-400 py-6">
              {filter === 'problem' ? 'Nenhum pedido com problema' :
             filter === 'pending' ? 'Nenhum pedido pendente' :
             'Nenhum pedido para esta data'}
            </p>
          )}
          {orders.map((o: any) => (
            <div key={o.id} className={`card ${
              o.status === 'CONFIRMED' ? 'border-red-200 bg-red-50' :
              o.status === 'PENDING' && Number(o.customer.balance) < 0 ? 'border-amber-200 bg-amber-50' : ''
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{o.customer.name}</p>
                    <span className={
                      o.status === 'PENDING'   ? 'badge-pending' :
                      o.status === 'PICKED_UP' ? 'badge-done' :
                      o.status === 'CONFIRMED' ? 'badge-problem' :
                      'badge-cancelled'
                    }>
                      {statusLabel[o.status]}
                    </span>
                    {o.customer.isBlocked && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Bloqueado</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">
                    {formatCPF(o.customer.cpf)} · {new Date(o.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm font-bold text-brand-500">{formatCurrency(Number(o.totalAmount))}</p>
                </div>
                <button onClick={() => setExpandedId(expandedId === o.id ? null : o.id)} className="text-gray-400 ml-2">
                  {expandedId === o.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>

              {expandedId === o.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  {o.items.map((item: any) => (
                    <div key={item.id} className="text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{item.quantity}× {item.meal.name}</span>
                        <span>{formatCurrency(Number(item.unitPrice) * item.quantity)}</span>
                      </div>
                      {item.options.map((opt: any) => (
                        <p key={opt.id} className="text-gray-400 pl-3 text-xs">· {opt.option.name}</p>
                      ))}
                    </div>
                  ))}
                  {Number(o.discount) > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600 font-medium">
                      <span>Desconto</span>
                      <span>−{formatCurrency(Number(o.discount))}</span>
                    </div>
                  )}
                  {o.status === 'CONFIRMED' && (
                    <div className="flex items-center gap-2 text-xs text-red-500 font-medium pt-1">
                      <AlertTriangle size={13} />
                      Saldo insuficiente — cliente precisa adicionar crédito na tela de Retirada
                    </div>
                  )}
                  {o.status === 'PENDING' && Number(o.customer.balance) < 0 && (
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-amber-600 font-medium">
                        <AlertTriangle size={13} />
                        Saldo negativo ({formatCurrency(Number(o.customer.balance))}) — aprovar ou rejeitar retirada
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveMut.mutate(o.id)}
                          disabled={approveMut.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2 rounded-xl transition-colors disabled:opacity-50">
                          <CheckCircle size={15} />
                          Aprovar retirada
                        </button>
                        <button
                          onClick={() => cancelMut.mutate(o.id)}
                          disabled={cancelMut.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2 rounded-xl transition-colors disabled:opacity-50">
                          <XCircle size={15} />
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
