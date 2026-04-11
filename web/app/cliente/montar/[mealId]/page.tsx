'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMeal, getDiscountRule } from '@/lib/api';
import { addToCart, formatCurrency, CartItemOption } from '@/lib/cart';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Minus, ShoppingCart } from 'lucide-react';

function isBeforeCutoff(cutoffTime: string) {
  const [h, m] = cutoffTime.split(':').map(Number);
  const cutoff = new Date();
  cutoff.setHours(h, m, 0, 0);
  return new Date() <= cutoff;
}

export default function MontarPage({ params }: { params: { mealId: string } }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);

  const { data: meal } = useQuery({ queryKey: ['meal', params.mealId], queryFn: () => getMeal(params.mealId) });
  const { data: rule } = useQuery({ queryKey: ['discount-rule-client'], queryFn: getDiscountRule });

  if (!meal) return <div className="p-4 text-gray-400">Carregando...</div>;

  const discountActive = rule && isBeforeCutoff(rule.cutoffTime);
  const discountPct = rule ? Number(rule.discountValue) : 0;

  function toggleOption(groupId: string, optionId: string, type: string) {
    setSelected((prev) => {
      const current = prev[groupId] || [];
      if (type === 'single') return { ...prev, [groupId]: [optionId] };
      if (current.includes(optionId)) return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      return { ...prev, [groupId]: [...current, optionId] };
    });
  }

  function calcTotal() {
    let price = Number(meal.basePrice);
    meal.optionGroups.forEach((g: any) => {
      (selected[g.id] || []).forEach((optId: string) => {
        const opt = g.options.find((o: any) => o.id === optId);
        if (opt) price += Number(opt.price);
      });
    });
    if (discountActive) price *= (1 - discountPct / 100);
    return price;
  }

  function handleAdd() {
    const options: CartItemOption[] = [];
    meal.optionGroups.forEach((g: any) => {
      (selected[g.id] || []).forEach((optId: string) => {
        const opt = g.options.find((o: any) => o.id === optId);
        if (opt) options.push({ optionId: opt.id, optionName: opt.name, price: Number(opt.price) });
      });
    });

    addToCart({
      mealId: meal.id,
      mealName: meal.name,
      quantity: qty,
      unitPrice: Number(meal.basePrice),
      options,
    });
    router.push('/cliente/carrinho');
  }

  const total = calcTotal();
  const baseTotal = Number(meal.basePrice);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">{meal.name}</h1>
      </div>

      <div className="p-4 space-y-4 pb-32">
        {/* Price header */}
        <div className="card flex items-center justify-between">
          <div>
            {discountActive ? (
              <>
                <p className="text-gray-400 line-through text-sm">{formatCurrency(baseTotal)}</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(baseTotal * (1 - discountPct / 100))}</p>
              </>
            ) : (
              <p className="text-2xl font-bold text-orange-500">{formatCurrency(baseTotal)}</p>
            )}
          </div>
          {meal.description && <p className="text-gray-400 text-sm max-w-[150px] text-right">{meal.description}</p>}
        </div>

        {/* Option Groups */}
        {meal.optionGroups.map((group: any) => (
          <div key={group.id} className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{group.name}</h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {group.type === 'single' ? 'Escolha 1' : 'Escolha vários'}
              </span>
            </div>
            <div className="space-y-2">
              {group.options.map((opt: any) => {
                const isSelected = (selected[group.id] || []).includes(opt.id);
                return (
                  <button key={opt.id} onClick={() => toggleOption(group.id, opt.id, group.type)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${isSelected ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                        {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <span className="font-medium">{opt.name}</span>
                    </div>
                    {Number(opt.price) > 0 && (
                      <span className="text-green-600 text-sm font-medium">+{formatCurrency(Number(opt.price))}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Quantity */}
        <div className="card flex items-center justify-between">
          <span className="font-bold">Quantidade</span>
          <div className="flex items-center gap-4">
            <button onClick={() => setQty(Math.max(1, qty - 1))}
              className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">
              <Minus size={16} />
            </button>
            <span className="text-xl font-bold w-6 text-center">{qty}</span>
            <button onClick={() => setQty(qty + 1)}
              className="w-9 h-9 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600">
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom: Add to cart */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <button onClick={handleAdd} className="btn-primary flex items-center justify-center gap-2">
          <ShoppingCart size={20} />
          Adicionar · {formatCurrency(total * qty)}
        </button>
      </div>
    </div>
  );
}
