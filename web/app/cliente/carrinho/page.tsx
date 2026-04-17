'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createOrder, getMe } from '@/lib/api';
import { getCart, updateCartItem, clearCart, cartTotal, formatCurrency, CartItem } from '@/lib/cart';
import { getUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Minus, ShoppingBag, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function CarrinhoPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const user = getUser();

  // Saldo sempre atualizado (compartilha cache com layout/home)
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });
  const balance = me != null ? Number(me.balance) : Number(user?.balance ?? 0);

  useEffect(() => { setCart(getCart()); }, []);

  const orderMut = useMutation({
    mutationFn: createOrder,
    onSuccess: (order) => {
      clearCart();
      router.push(`/cliente/historico?success=${order.id}`);
    },
  });

  function updateQty(index: number, qty: number) {
    updateCartItem(index, qty);
    setCart(getCart());
  }

  const total = cartTotal(cart);

  function handleOrder() {
    if (!user) return;
    orderMut.mutate({
      customerId: user.id,
      items: cart.map((item) => ({
        mealId: item.mealId,
        quantity: item.quantity,
        options: item.options.map((o) => ({ optionId: o.optionId })),
      })),
    });
  }

  if (cart.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <ShoppingBag size={64} className="text-gray-200" />
        <p className="text-gray-400 text-lg">Seu carrinho está vazio</p>
        <Link href="/cliente/home" className="btn-primary max-w-xs">Ver marmitas do dia</Link>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-6">
      <h1 className="text-xl font-bold">Meu Carrinho</h1>

      <div className="space-y-3">
        {cart.map((item, i) => {
          const itemTotal = (item.unitPrice + item.options.reduce((s, o) => s + o.price, 0)) * item.quantity;
          return (
            <div key={i} className="card space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold">{item.mealName}</p>
                  {item.options.map((o) => (
                    <p key={o.optionId} className="text-xs text-gray-400">· {o.optionName}</p>
                  ))}
                </div>
                <p className="font-bold text-orange-500">{formatCurrency(itemTotal)}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => updateQty(i, item.quantity - 1)}
                    className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-red-100">
                    {item.quantity === 1 ? <Trash2 size={14} className="text-red-400" /> : <Minus size={14} />}
                  </button>
                  <span className="text-lg font-bold w-5 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(i, item.quantity + 1)}
                    className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600">
                    <Plus size={14} />
                  </button>
                </div>
                <p className="text-xs text-gray-400">{formatCurrency(item.unitPrice + item.options.reduce((s, o) => s + o.price, 0))} / un</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="card space-y-2">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Subtotal</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span className="text-orange-500">{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-400">
          <span>Seu saldo</span>
          <span className={balance >= total ? 'text-green-600' : 'text-red-500'}>
            {formatCurrency(balance)}
          </span>
        </div>
        </div>

      {/* Aviso de não-retiradas */}
      {me?.isBlocked && (
        <div className="card bg-amber-50 border border-amber-200 space-y-1">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle size={18} />
            <p className="font-semibold text-sm">Atenção: não-retiradas registradas</p>
          </div>
          <p className="text-amber-700 text-sm">
            Você possui pedidos não retirados. A marmitaria pode recusar este pedido.
          </p>
        </div>
      )}

      {/* Aviso de saldo insuficiente */}
      {balance < total && (
        <div className="card bg-red-50 border border-red-200 space-y-1">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={18} />
            <p className="font-semibold text-sm">Saldo insuficiente</p>
          </div>
          <p className="text-red-500 text-sm">
            Faltam <strong>{formatCurrency(total - balance)}</strong> para retirada.
            Adicione crédito na marmitaria antes de retirar.
          </p>
        </div>
      )}

      {orderMut.isError && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
          {(orderMut.error as any)?.response?.data?.message || 'Erro ao fazer pedido'}
        </div>
      )}

      {balance < total ? (
        <button className="btn-primary bg-gray-600 hover:bg-gray-700" onClick={handleOrder}
          disabled={orderMut.isPending}>
          {orderMut.isPending ? 'Finalizando...' : `Finalizar mesmo assim · ${formatCurrency(total)}`}
        </button>
      ) : (
        <button className="btn-primary" onClick={handleOrder} disabled={orderMut.isPending}>
          {orderMut.isPending ? 'Finalizando...' : `Finalizar pedido · ${formatCurrency(total)}`}
        </button>
      )}
    </div>
  );
}
