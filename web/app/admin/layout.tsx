'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getToken, getUser, clearAuth } from '@/lib/auth';
import { getSubscription } from '@/lib/api';
import { LayoutDashboard, Users, UtensilsCrossed, ShoppingBag, Settings, LogOut, PackageCheck, AlertTriangle, Lock } from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard',     label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/clientes',      label: 'Clientes',  icon: Users },
  { href: '/admin/marmitas',      label: 'Marmitas',  icon: UtensilsCrossed },
  { href: '/admin/pedidos',       label: 'Pedidos',   icon: ShoppingBag },
  { href: '/admin/retirada',      label: 'Retirada',  icon: PackageCheck },
  { href: '/admin/configuracoes', label: 'Config',    icon: Settings },
];

const planLabel: Record<string, string> = {
  monthly: 'Mensal', quarterly: 'Trimestral', annual: 'Anual', trial: 'Trial',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    if (pathname === '/admin/login') return;
    const token = getToken();
    const user  = getUser();
    if (!token || user?.role !== 'admin') router.push('/admin/login');
  }, [pathname, router]);

  const { data: sub } = useQuery({
    queryKey: ['subscription'],
    queryFn: getSubscription,
    enabled: pathname !== '/admin/login',
    refetchInterval: 5 * 60_000,
  });

  if (pathname === '/admin/login') return <>{children}</>;

  const user = getUser();

  const isBlocked    = sub?.isBlocked === true;
  const alertDays    = sub?.alertDaysLeft;
  const showAlert    = !isBlocked && alertDays !== null && alertDays !== undefined;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center text-base shadow-brand">
            🍱
          </div>
          <div>
            <p className="font-bold text-sm leading-tight text-gray-900">{user?.tenantName || 'Marmitaria'}</p>
            <p className="text-xs text-gray-400">{user?.name}</p>
          </div>
        </div>
        <button
          onClick={() => { clearAuth(); router.push('/admin/login'); }}
          className="text-gray-400 hover:text-red-500 transition-colors p-1">
          <LogOut size={20} />
        </button>
      </header>

      {/* Banner de alerta de assinatura */}
      {showAlert && (
        <div className={`px-4 py-2.5 flex items-center gap-2 text-sm font-medium
          ${alertDays === 0
            ? 'bg-red-500 text-white'
            : alertDays <= 3
            ? 'bg-orange-500 text-white'
            : 'bg-amber-50 text-amber-800 border-b border-amber-200'}`}>
          <AlertTriangle size={15} className="shrink-0" />
          {sub?.status === 'trial'
            ? alertDays === 0
              ? 'Seu período gratuito vence hoje! Assine para continuar usando.'
              : `Período gratuito: ${alertDays} dia${alertDays > 1 ? 's' : ''} restante${alertDays > 1 ? 's' : ''}. Assine para não perder o acesso.`
            : alertDays === 0
            ? 'Sua assinatura vence hoje! Renove para continuar usando.'
            : `Sua assinatura vence em ${alertDays} dia${alertDays > 1 ? 's' : ''}. Renove para não perder o acesso.`
          }
          <Link href="/admin/configuracoes" className="ml-auto underline font-semibold whitespace-nowrap">
            Ver planos
          </Link>
        </div>
      )}

      {/* Tela de bloqueio */}
      {isBlocked && pathname !== '/admin/configuracoes' ? (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso bloqueado</h2>
          <p className="text-gray-500 text-sm mb-1">
            {sub?.status === 'trial'
              ? 'Seu período gratuito de 7 dias encerrou.'
              : 'Sua assinatura está vencida.'}
          </p>
          <p className="text-gray-400 text-sm mb-6">Assine um plano para continuar usando o sistema.</p>
          <Link href="/admin/configuracoes"
            className="inline-flex items-center gap-2 bg-gradient-to-br from-brand-500 to-brand-600 text-white font-semibold px-6 py-3 rounded-xl shadow-brand hover:shadow-brand-lg transition-all">
            Ver planos e assinar
          </Link>
        </div>
      ) : (
        <main className="pb-20">{children}</main>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-10 shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon   = item.icon;
          // Configurações sempre acessível mesmo bloqueado
          const disabled = isBlocked && item.href !== '/admin/configuracoes';
          return (
            <Link
              key={item.href}
              href={disabled ? '#' : item.href}
              className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors relative
                ${active ? 'text-brand-500' : disabled ? 'text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>
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
