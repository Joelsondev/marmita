'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMeals, createMeal, createOptionGroup, createOption, deleteMeal, deleteOptionGroup, deleteOption } from '@/lib/api';
import { formatCurrency } from '@/lib/cart';
import { Plus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';

export default function MarmitasPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [showGroup, setShowGroup] = useState<string | null>(null);
  const [showOption, setShowOption] = useState<string | null>(null);
  const [mealForm, setMealForm] = useState({ name: '', description: '', basePrice: '', date: new Date().toISOString().slice(0, 10) });
  const [groupForm, setGroupForm] = useState({ name: '', type: 'single', required: false });
  const [optForm, setOptForm] = useState({ name: '', price: '' });

  const { data: meals = [], isLoading } = useQuery({ queryKey: ['meals'], queryFn: () => getMeals() });

  const createMealMut = useMutation({
    mutationFn: createMeal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meals'] }); setShowNew(false); setMealForm({ name: '', description: '', basePrice: '', date: new Date().toISOString().slice(0, 10) }); },
  });

  const deleteM = useMutation({ mutationFn: deleteMeal, onSuccess: () => qc.invalidateQueries({ queryKey: ['meals'] }) });
  const createGroupMut = useMutation({ mutationFn: createOptionGroup, onSuccess: () => { qc.invalidateQueries({ queryKey: ['meals'] }); setShowGroup(null); setGroupForm({ name: '', type: 'single', required: false }); } });
  const deleteGroupMut = useMutation({ mutationFn: deleteOptionGroup, onSuccess: () => qc.invalidateQueries({ queryKey: ['meals'] }) });
  const createOptMut = useMutation({ mutationFn: createOption, onSuccess: () => { qc.invalidateQueries({ queryKey: ['meals'] }); setShowOption(null); setOptForm({ name: '', price: '' }); } });
  const deleteOptMut = useMutation({ mutationFn: deleteOption, onSuccess: () => qc.invalidateQueries({ queryKey: ['meals'] }) });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Marmitas</h1>
        <button onClick={() => setShowNew(true)} className="bg-orange-500 text-white p-2 rounded-xl hover:bg-orange-600">
          <Plus size={20} />
        </button>
      </div>

      {isLoading ? <div className="text-center py-8 text-gray-400">Carregando...</div> : (
        <div className="space-y-3">
          {meals.map((m: any) => (
            <div key={m.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-sm text-gray-400">{new Date(m.date).toLocaleDateString('pt-BR')} · {formatCurrency(Number(m.basePrice))}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setExpandedMeal(expandedMeal === m.id ? null : m.id)}
                    className="text-gray-400 hover:text-gray-600">
                    {expandedMeal === m.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  <button onClick={() => deleteM.mutate(m.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expandedMeal === m.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  {m.optionGroups.map((g: any) => (
                    <div key={g.id} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium text-sm">{g.name}</span>
                          <span className="ml-2 text-xs text-gray-400">({g.type === 'single' ? 'único' : 'múltiplo'})</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setShowOption(g.id)} className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-lg">
                            + Opção
                          </button>
                          <button onClick={() => deleteGroupMut.mutate(g.id)} className="text-red-400">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {g.options.map((o: any) => (
                          <div key={o.id} className="flex items-center justify-between text-sm">
                            <span>{o.name}</span>
                            <div className="flex items-center gap-2">
                              {Number(o.price) > 0 && <span className="text-green-600 text-xs">+{formatCurrency(Number(o.price))}</span>}
                              <button onClick={() => deleteOptMut.mutate(o.id)} className="text-red-300"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setShowGroup(m.id)}
                    className="w-full border-2 border-dashed border-gray-200 text-gray-400 py-2 rounded-xl text-sm hover:border-orange-300 hover:text-orange-400 transition-colors">
                    + Adicionar grupo
                  </button>
                </div>
              )}
            </div>
          ))}
          {meals.length === 0 && <p className="text-center text-gray-400 py-6">Nenhuma marmita cadastrada</p>}
        </div>
      )}

      {/* Modal: Nova Marmita */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-t-2xl w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Nova Marmita</h2>
              <button onClick={() => setShowNew(false)}><X size={20} /></button>
            </div>
            <div>
              <label className="label">Nome</label>
              <input className="input" placeholder="Ex: Marmita de frango" value={mealForm.name}
                onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Descrição (opcional)</label>
              <input className="input" placeholder="Descrição da marmita" value={mealForm.description}
                onChange={(e) => setMealForm({ ...mealForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Preço base (R$)</label>
                <input className="input" type="number" step="0.01" min="0" placeholder="0,00"
                  value={mealForm.basePrice} onChange={(e) => setMealForm({ ...mealForm, basePrice: e.target.value })} />
              </div>
              <div>
                <label className="label">Data</label>
                <input className="input" type="date" value={mealForm.date}
                  onChange={(e) => setMealForm({ ...mealForm, date: e.target.value })} />
              </div>
            </div>
            <button className="btn-primary" disabled={createMealMut.isPending}
              onClick={() => createMealMut.mutate({ name: mealForm.name, description: mealForm.description, basePrice: parseFloat(mealForm.basePrice), date: mealForm.date })}>
              {createMealMut.isPending ? 'Salvando...' : 'Criar Marmita'}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Novo Grupo */}
      {showGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowGroup(null)}>
          <div className="bg-white rounded-t-2xl w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Novo Grupo</h2>
              <button onClick={() => setShowGroup(null)}><X size={20} /></button>
            </div>
            <div>
              <label className="label">Nome do grupo</label>
              <input className="input" placeholder="Ex: Proteína, Acompanhamento" value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Tipo de seleção</label>
              <select className="input" value={groupForm.type} onChange={(e) => setGroupForm({ ...groupForm, type: e.target.value })}>
                <option value="single">Única escolha</option>
                <option value="multiple">Múltipla escolha</option>
              </select>
            </div>
            <button className="btn-primary" disabled={createGroupMut.isPending}
              onClick={() => createGroupMut.mutate({ mealId: showGroup, name: groupForm.name, type: groupForm.type })}>
              {createGroupMut.isPending ? 'Salvando...' : 'Criar Grupo'}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Nova Opção */}
      {showOption && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowOption(null)}>
          <div className="bg-white rounded-t-2xl w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Nova Opção</h2>
              <button onClick={() => setShowOption(null)}><X size={20} /></button>
            </div>
            <div>
              <label className="label">Nome da opção</label>
              <input className="input" placeholder="Ex: Frango, Arroz, Feijão" value={optForm.name}
                onChange={(e) => setOptForm({ ...optForm, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Preço adicional (R$) — 0 se incluso</label>
              <input className="input" type="number" step="0.01" min="0" placeholder="0,00"
                value={optForm.price} onChange={(e) => setOptForm({ ...optForm, price: e.target.value })} />
            </div>
            <button className="btn-primary" disabled={createOptMut.isPending}
              onClick={() => createOptMut.mutate({ groupId: showOption, name: optForm.name, price: parseFloat(optForm.price || '0') })}>
              {createOptMut.isPending ? 'Salvando...' : 'Adicionar Opção'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
