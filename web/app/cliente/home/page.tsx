'use client';
import { useQuery } from '@tanstack/react-query';
import { getTodayMeals, getDiscountRule, getMe, getMyOrders } from '@/lib/api';
import { getUser, setAuth, getToken } from '@/lib/auth';
import { formatCurrency } from '@/lib/cart';
import Link from 'next/link';
import { Clock, Tag, QrCode, AlertTriangle, CheckCircle, PackageCheck, ChevronRight } from 'lucide-react';

function isBeforeCutoff(cutoffTime: string) {
  const [h, m] = cutoffTime.split(':').map(Number);
  const now    = new Date();
  const cutoff = new Date();
  cutoff.setHours(h, m, 0, 0);
  return now <= cutoff;
}

const statusConfig: Record<string, { label: string; classes: string; icon: any }> = {
  PENDING:   { label: 'Aguardando retirada', classes: 'text-amber-700 bg-amber-50 border-amber-200',  icon: Clock },
  CONFIRMED: { label: 'Saldo insuficiente',  classes: 'text-rose-700 bg-rose-50 border-rose-200',     icon: AlertTriangle },
  PICKED_UP: { label: 'Retirado',            classes: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle },
  CANCELLED: { label: 'Cancelado',           classes: 'text-slate-500 bg-slate-50 border-slate-200',  icon: null },
};

export default function ClienteHomePage() {
  const localUser = getUser();

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const data = await getMe();
      const token = getToken();
      if (token) setAuth(token, { ...localUser, balance: data.balance });
      return data;
    },
    refetchInterval: 30_000,
  });

  const balance = me ? Number(me.balance) : Number(localUser?.balance || 0);

  const { data: meals  = [] } = useQuery({ queryKey: ['meals-today-client'],    queryFn: getTodayMeals });
  const { data: rule }        = useQuery({ queryKey: ['discount-rule-client'],   queryFn: getDiscountRule });
  const { data: myOrders = [] } = useQuery({ queryKey: ['my-orders'], queryFn: getMyOrders, refetchInterval: 30_000 });

  const discountActive = rule && isBeforeCutoff(rule.cutoffTime);
  const discountPct    = rule ? Number(rule.discountValue) : 0;

  const pendingOrders = (myOrders as any[]).filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED');
  const totalDue      = pendingOrders.reduce((s: number, o: any) => s + Number(o.totalAmount), 0);
  const canPickup     = balance >= totalDue && pendingOrders.length > 0;
  const missing       = totalDue - balance;

  return (
    <div className="space-y-4 pb-4">

      {/* Pedidos de hoje */}
      {(myOrders as any[]).length > 0 && (
        <div className="px-4 pt-4 space-y-3">
          <p className="section-title">Pedidos de hoje</p>
          {(myOrders as any[]).map((order: any) => {
            const cfg  = statusConfig[order.status] || statusConfig.CANCELLED;
            const Icon = cfg.icon;
            const orderTotal   = Number(order.totalAmount);
            const orderMissing = orderTotal - balance;
            return (
              <div key={order.id} className={`rounded-2xl border p-3.5 ${cfg.classes}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {Icon && <Icon size={15} />}
                    <span className="font-semibold text-sm">{cfg.label}</span>
                  </div>
                  <span className="font-bold text-sm">{formatCurrency(orderTotal)}</span>
                </div>
                <p className="mt-1.5 text-xs opacity-70">
                  {order.items.map((item: any) => `${item.quantity}× ${item.meal.name}`).join(', ')}
                </p>
                {order.status === 'CONFIRMED' && orderMissing > 0 && (
                  <p className="text-xs mt-1.5 font-semibold">
                    Faltam {formatCurrency(orderMissing)} — adicione crédito na marmitaria
                  </p>
                )}
              </div>
            );
          })}

          {/* Banner de retirada */}
          {pendingOrders.length > 0 && (
            canPickup ? (
              <Link href="/cliente/qrcode"
                className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-emerald-700 hover:bg-emerald-100 transition-colors">
                <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <PackageCheck size={18} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Pronto para retirar!</p>
                  <p className="text-xs text-emerald-600">Apresente seu QR Code no balcão</p>
                </div>
                <QrCode size={20} className="text-emerald-500" />
              </Link>
            ) : (
              <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-rose-700">
                <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="font-semibold text-sm">Faltam {formatCurrency(missing)}</p>
                  <p className="text-xs text-rose-500">Adicione crédito antes de retirar</p>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* QR Code link */}
      <div className="px-4">
        <Link href="/cliente/qrcode"
          className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-4 shadow-elevated hover:-translate-y-0.5 transition-all duration-200 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <QrCode size={22} />
            </div>
            <div>
              <p className="font-bold text-sm">Meu QR Code</p>
              <p className="text-slate-400 text-xs">Apresente no balcão para retirar</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-500" />
        </Link>
      </div>

      {/* Desconto */}
      {rule && (
        <div className="px-4">
          <div className={`rounded-2xl p-3.5 flex items-center gap-3 border ${discountActive ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${discountActive ? 'bg-emerald-100' : 'bg-slate-100'}`}>
              <Tag size={16} className={discountActive ? 'text-emerald-600' : 'text-slate-400'} />
            </div>
            <div className="flex-1">
              {discountActive ? (
                <>
                  <p className="font-semibold text-emerald-700 text-sm">{discountPct}% de desconto ativo!</p>
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                    <Clock size={11} /> Pedidos até {rule.cutoffTime}
                  </p>
                </>
              ) : (
                <p className="text-slate-500 text-sm">Desconto encerrado para hoje</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Marmitas do dia */}
      <div className="px-4">
        <h2 className="font-bold text-lg text-slate-900 mb-3">Marmita de hoje</h2>
        {meals.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-4xl mb-3">🍱</p>
            <p className="text-slate-400 text-sm">Nenhuma marmita disponível hoje</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(meals as any[]).map((meal: any) => {
              const base       = Number(meal.basePrice);
              const discounted = discountActive ? base * (1 - discountPct / 100) : base;
              return (
                <div key={meal.id} className="card space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="font-bold text-lg text-slate-900 leading-tight">{meal.name}</h3>
                      {meal.description && <p className="text-slate-400 text-sm mt-0.5">{meal.description}</p>}
                    </div>
                    <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                      🍱
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {discountActive ? (
                      <>
                        <span className="text-slate-400 line-through text-sm">{formatCurrency(base)}</span>
                        <span className="text-2xl font-extrabold text-emerald-600">{formatCurrency(discounted)}</span>
                        <span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-semibold">
                          -{discountPct}%
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl font-extrabold text-brand-500">{formatCurrency(base)}</span>
                    )}
                  </div>

                  {meal.optionGroups?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {meal.optionGroups.map((g: any) => (
                        <span key={g.id} className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <Link href={`/cliente/montar/${meal.id}`} className="btn-primary text-base">
                    Montar Pedido
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
