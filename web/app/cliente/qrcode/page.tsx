'use client';
import { useQuery } from '@tanstack/react-query';
import { getUser } from '@/lib/auth';
import { api, getMe } from '@/lib/api';
import { QRCodeSVG } from 'qrcode.react';
import { formatCurrency } from '@/lib/cart';
import { RefreshCw, PackageCheck, ShoppingBag, AlertTriangle } from 'lucide-react';

function formatCPF(v: string) {
  return v?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '';
}

export default function QRCodePage() {
  const user = getUser();

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['qr-token'],
    queryFn: () => api.get('/orders/qr-token').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });
  const balance = me != null ? Number(me.balance) : Number(user?.balance ?? 0);
  const isNegative = balance < 0;

  if (!user) return null;

  return (
    <div className="p-4 flex flex-col items-center gap-5 min-h-[80vh] justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-1">Seu QR Code</h1>
        <p className="text-gray-400 text-sm">Mostre para retirar sua marmita</p>
      </div>

      {/* QR Code */}
      <div className="relative bg-white p-6 rounded-3xl shadow-lg border-4 border-orange-100">
        {isFetching && (
          <div className="absolute inset-0 bg-white/80 rounded-3xl flex items-center justify-center">
            <RefreshCw size={32} className="text-brand-500 animate-spin" />
          </div>
        )}
        {data?.token ? (
          <QRCodeSVG value={data.token} size={220} level="M" />
        ) : (
          <div className="w-[220px] h-[220px] flex items-center justify-center">
            <RefreshCw size={40} className="text-gray-300 animate-spin" />
          </div>
        )}
      </div>

      {/* Código do pedido */}
      {data?.hasOrder ? (
        <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-2xl px-5 py-3">
          <PackageCheck size={18} className="text-brand-500 shrink-0" />
          <div>
            <p className="text-xs text-brand-600 font-medium">Código do pedido</p>
            <p className="text-lg font-extrabold text-brand-700 font-mono tracking-widest">
              #{data.orderCode}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-amber-700 text-sm">
          <ShoppingBag size={16} className="shrink-0" />
          Nenhum pedido pendente hoje
        </div>
      )}

      <button
        onClick={() => refetch()}
        disabled={isFetching}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-brand-500 transition-colors">
        <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        Atualizar código
      </button>

      {/* User info */}
      <div className={`card w-full text-center space-y-1 ${isNegative ? 'border border-red-200 bg-red-50' : ''}`}>
        <p className="text-xl font-bold">{user.name}</p>
        <p className="text-gray-400 font-mono tracking-wider">{formatCPF(user.cpf)}</p>
        <p className={`text-2xl font-bold ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
          {formatCurrency(balance)}
        </p>
        <p className="text-xs text-gray-400">saldo disponível</p>
        {isNegative && (
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <AlertTriangle size={13} className="text-red-500" />
            <p className="text-xs text-red-600 font-medium">Adicione saldo na marmitaria para retirar</p>
          </div>
        )}
      </div>
    </div>
  );
}
