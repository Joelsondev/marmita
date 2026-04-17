'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getToken, getUser, clearAuth, setAuth } from '@/lib/auth';
import { getMe } from '@/lib/api';
import { Home, ShoppingCart, QrCode, History, AlertTriangle } from 'lucide-react';

const navItems = [
  { href: '/cliente/home',      label: 'Início',    icon: Home },
  { href: '/cliente/carrinho',  label: 'Carrinho',  icon: ShoppingCart },
  { href: '/cliente/qrcode',    label: 'QR Code',   icon: QrCode },
  { href: '/cliente/historico', label: 'Histórico', icon: History },
];

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    const token = getToken();
    const user  = getUser();
    if (!token || user?.role !== 'customer') router.push('/login');
  }, [router]);

  const qc = useQueryClient();
  const [localUser, setLocalUser] = useState(() => getUser());

  useEffect(() => {
    function onStorage() { setLocalUser(getUser()); }
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onStorage);
    };
  }, []);

  // Busca saldo atualizado do servidor a cada 30s
  const { data: freshUser } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const data = await getMe();
      const token = getToken();
      const lu = getUser();
      if (token && lu) setAuth(token, { ...lu, balance: data.balance });
      return data;
    },
    refetchInterval: 30_000,
    enabled: typeof window !== 'undefined' && !!getToken() && getUser()?.role === 'customer',
  });

  const user = localUser;
  const balance = freshUser != null ? Number(freshUser.balance) : Number(localUser?.balance ?? 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-br from-brand-600 via-brand-500 to-brand-400 text-white px-4 pt-4 pb-6 sticky top-0 z-10 shadow-brand">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍱</span>
            <p className="font-bold text-sm leading-tight">{user?.name || 'Cliente'}</p>
          </div>
          <button
            onClick={() => { clearAuth(); qc.clear(); router.push('/login'); }}
            className="text-brand-100 text-xs underline hover:text-white transition-colors">
            Sair
          </button>
        </div>

        {/* Card de saldo */}
        <div className={`backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center justify-between border ${balance < 0 ? 'bg-red-500/25 border-red-300/40' : 'bg-white/15 border-white/20'}`}>
          <div>
            <p className="text-xs text-white/70 font-medium uppercase tracking-wide">Saldo disponível</p>
            <p className={`text-3xl font-extrabold leading-tight mt-0.5 ${balance < 0 ? 'text-red-200' : 'text-white'}`}>
              R$ {balance.toFixed(2)}
            </p>
            {balance < 0 && (
              <div className="flex items-center gap-1 mt-1">
                <AlertTriangle size={11} className="text-red-200" />
                <p className="text-xs text-red-200 font-medium">Adicione saldo para retirar sua marmita</p>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${balance < 0 ? 'bg-red-400/25' : 'bg-white/20'}`}>
            {balance < 0 ? '⚠️' : '💰'}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pb-20">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-10 shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon   = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors relative
                ${active ? 'text-brand-500' : 'text-gray-400 hover:text-gray-600'}`}>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-brand-500 rounded-full" />
              )}
              <span className={`flex items-center justify-center w-8 h-6 rounded-lg transition-colors ${active ? 'bg-brand-50' : ''}`}>
                <Icon size={20} />
              </span>
              <span className="mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
