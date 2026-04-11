'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getToken, getUser, clearAuth } from '@/lib/auth';
import { Home, ShoppingCart, QrCode, History } from 'lucide-react';

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

  const [user, setUser] = useState(() => getUser());

  useEffect(() => {
    function onStorage() { setUser(getUser()); }
    window.addEventListener('storage', onStorage);
    // atualiza ao focar a aba (volta de outra página)
    window.addEventListener('focus', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onStorage);
    };
  }, []);

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
            onClick={() => { clearAuth(); router.push('/login'); }}
            className="text-brand-100 text-xs underline hover:text-white transition-colors">
            Sair
          </button>
        </div>

        {/* Card de saldo */}
        <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center justify-between border border-white/20">
          <div>
            <p className="text-xs text-white/70 font-medium uppercase tracking-wide">Saldo disponível</p>
            <p className="text-3xl font-extrabold text-white leading-tight mt-0.5">
              R$ {Number(user?.balance || 0).toFixed(2)}
            </p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
            💰
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
