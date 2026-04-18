'use client';
import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTransactions } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { formatCurrency } from '@/lib/cart';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import Link from 'next/link';

function HistoricoContent() {
  const user = getUser();
  const searchParams = useSearchParams();
  const success = searchParams.get('success');

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: () => getTransactions(user?.id || ''),
    enabled: !!user?.id,
  });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Histórico</h1>

      {/* Success banner */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="text-green-500" size={28} />
          <div>
            <p className="font-bold text-green-700">Pedido realizado!</p>
            <p className="text-green-600 text-sm">Mostre seu QR Code na retirada</p>
          </div>
        </div>
      )}

      {/* Balance */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-4 text-white">
        <p className="text-orange-100 text-sm">Saldo atual</p>
        <p className="text-3xl font-bold">{formatCurrency(Number(user?.balance || 0))}</p>
      </div>

      {/* Transactions */}
      <div>
        <h2 className="font-semibold mb-2">Movimentações</h2>
        {isLoading ? (
          <p className="text-gray-400 text-sm text-center py-4">Carregando...</p>
        ) : transactions.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">Nenhuma movimentação</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((t: any) => (
              <div key={t.id} className="card flex items-center gap-3">
                {t.type === 'CREDIT' ? (
                  <ArrowUpCircle size={28} className="text-green-500 shrink-0" />
                ) : (
                  <ArrowDownCircle size={28} className="text-red-400 shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{t.description || (t.type === 'CREDIT' ? 'Crédito' : 'Débito')}</p>
                  <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString('pt-BR')}</p>
                </div>
                <span className={`font-bold ${t.type === 'CREDIT' ? 'text-green-600' : 'text-red-500'}`}>
                  {t.type === 'CREDIT' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {success && (
        <Link href="/cliente/qrcode" className="btn-primary flex items-center justify-center gap-2">
          Ver meu QR Code
        </Link>
      )}
    </div>
  );
}

export default function HistoricoPage() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-400 text-sm text-center">Carregando...</div>}>
      <HistoricoContent />
    </Suspense>
  );
}
