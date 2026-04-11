'use client';
import { useQuery } from '@tanstack/react-query';
import { getDashboard, getOrders } from '@/lib/api';
import { formatCurrency } from '@/lib/cart';
import Link from 'next/link';
import { ShoppingBag, PackageCheck, AlertTriangle, ArrowRight, RefreshCw, TrendingUp, Calendar } from 'lucide-react';

function formatCPF(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
}

function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub?: string; color: string; icon?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col gap-1">
      {icon && <div className="mb-1">{icon}</div>}
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 30_000,
  });

  const { data: pendingOrders = [] } = useQuery({
    queryKey: ['orders-dashboard'],
    queryFn: () => getOrders(),
    refetchInterval: 30_000,
    select: (data: any[]) => data.filter((o) => o.status === 'PENDING').slice(0, 5),
  });

  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <button onClick={() => refetch()} className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-500 transition-colors">
          <RefreshCw size={13} />
          {lastUpdate ?? 'Atualizar'}
        </button>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-20 bg-gray-50 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Pedidos hoje"     value={stats?.ordersToday ?? 0}          color="text-brand-500" />
          <StatCard label="Retiradas"        value={stats?.pickedUpToday ?? 0}        color="text-emerald-600" />
          <StatCard label="Aguardando"       value={stats?.pendingPickup ?? 0}        color="text-amber-500" />
          <StatCard label="Total arrecadado" value={stats ? formatCurrency(Number(stats.totalRevenue)) : 'R$ 0'} color="text-blue-600" />
          <StatCard
            label="Faturamento do mês"
            value={stats ? formatCurrency(Number(stats.monthlyRevenue)) : 'R$ 0'}
            sub="mês atual"
            color="text-purple-600"
            icon={<Calendar size={14} className="text-purple-400" />}
          />
          <StatCard
            label="Retiradas no mês"
            value={stats?.monthlyPickedUp ?? 0}
            sub="mês atual"
            color="text-teal-600"
            icon={<TrendingUp size={14} className="text-teal-400" />}
          />
        </div>
      )}

      {/* Alerta saldo insuficiente */}
      {(stats?.pendingPayment ?? 0) > 0 && (
        <div className="card border border-red-200 bg-red-50 space-y-3">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={18} />
            <p className="font-bold text-sm">
              {stats!.pendingPayment} pedido{stats!.pendingPayment > 1 ? 's' : ''} com saldo insuficiente
            </p>
          </div>
          {stats!.problemOrders.map((order: any) => {
            const balance = Number(order.customer.balance);
            const total   = Number(order.totalAmount);
            const missing = total - balance;
            return (
              <div key={order.id} className="flex items-center justify-between text-sm border-t border-red-100 pt-2">
                <div>
                  <p className="font-medium">{order.customer.name}</p>
                  <p className="text-xs text-gray-400">{formatCPF(order.customer.cpf)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600">{formatCurrency(total)}</p>
                  <p className="text-xs text-red-400">Faltam {formatCurrency(missing)}</p>
                </div>
              </div>
            );
          })}
          <Link href="/admin/retirada"
            className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-sm font-semibold transition-colors">
            Ir para retirada <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* CTA Retirada */}
      <Link href="/admin/retirada"
        className="card flex items-center justify-between bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:shadow-brand transition-shadow">
        <div className="flex items-center gap-3">
          <PackageCheck size={28} />
          <div>
            <p className="font-bold">Tela de Retirada</p>
            <p className="text-brand-100 text-xs">Escanear QR ou buscar por CPF</p>
          </div>
        </div>
        <ArrowRight size={20} className="text-brand-200" />
      </Link>

      {/* Pedidos aguardando */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Aguardando retirada
          </h2>
          <Link href="/admin/pedidos" className="text-brand-500 text-sm flex items-center gap-1">
            Ver todos <ArrowRight size={12} />
          </Link>
        </div>

        {pendingOrders.length === 0 ? (
          <div className="card text-center py-5">
            <PackageCheck size={32} className="mx-auto text-green-300 mb-2" />
            <p className="text-gray-400 text-sm">Nenhum pedido aguardando</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingOrders.map((order: any) => (
              <div key={order.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold">{order.customer.name}</p>
                  <p className="text-xs text-gray-400">
                    {order.items.length} item{order.items.length > 1 ? 'ns' : ''} ·{' '}
                    {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-500">{formatCurrency(Number(order.totalAmount))}</p>
                  <span className="badge-pending">Pendente</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
