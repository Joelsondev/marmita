'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMeals, createMeal, updateMeal, copyMeal as apiCopyMeal,
  createOptionGroup, createOption, deleteOptionGroup, deleteOption,
} from '@/lib/api';
import { formatCurrency } from '@/lib/cart';
import { Plus, ChevronDown, ChevronUp, X, Copy, Power, ChevronLeft, ChevronRight, Trash2, Pencil } from 'lucide-react';

function shiftDay(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function MarmitasPage() {
  const qc = useQueryClient();
  const todayStr = localToday();

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showNew, setShowNew] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [showGroup, setShowGroup] = useState<string | null>(null);
  const [showOption, setShowOption] = useState<string | null>(null);
  const [copyTarget, setCopyTarget] = useState<{ id: string; name: string } | null>(null);
  const [copyDate, setCopyDate] = useState(todayStr);
  const [editTarget, setEditTarget] = useState<{ id: string; name: string; description: string; basePrice: string } | null>(null);
  const [mealForm, setMealForm] = useState({ name: '', description: '', basePrice: '', date: todayStr });
  const [groupForm, setGroupForm] = useState({ name: '', type: 'single' });
  const [optForm, setOptForm] = useState({ name: '', price: '' });

  const prevDate = shiftDay(selectedDate, -1);

  const { data: meals = [], isLoading } = useQuery({
    queryKey: ['meals', selectedDate],
    queryFn: () => getMeals(selectedDate),
  });

  const { data: prevMeals = [] } = useQuery({
    queryKey: ['meals', prevDate],
    queryFn: () => getMeals(prevDate),
    enabled: !isLoading && meals.length === 0,
  });

  const createMealMut = useMutation({
    mutationFn: createMeal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meals'] });
      setShowNew(false);
      setMealForm({ name: '', description: '', basePrice: '', date: selectedDate });
    },
  });

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateMeal(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meals', selectedDate] }),
  });

  const editMealMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateMeal(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meals', selectedDate] }); setEditTarget(null); },
  });

  const doCopy = useMutation({
    mutationFn: ({ id, targetDate }: { id: string; targetDate: string }) => apiCopyMeal(id, targetDate),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meals'] }); setCopyTarget(null); },
  });

  const createGroupMut = useMutation({
    mutationFn: createOptionGroup,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meals'] }); setShowGroup(null); setGroupForm({ name: '', type: 'single' }); },
  });
  const deleteGroupMut = useMutation({ mutationFn: deleteOptionGroup, onSuccess: () => qc.invalidateQueries({ queryKey: ['meals'] }) });
  const createOptMut = useMutation({
    mutationFn: createOption,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meals'] }); setShowOption(null); setOptForm({ name: '', price: '' }); },
  });
  const deleteOptMut = useMutation({ mutationFn: deleteOption, onSuccess: () => qc.invalidateQueries({ queryKey: ['meals'] }) });

  function openCopy(meal: any) {
    setCopyTarget({ id: meal.id, name: meal.name });
    setCopyDate(selectedDate);
  }

  function renderGroups(meal: any, editable: boolean) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
        {meal.optionGroups.map((g: any) => (
          <div key={g.id} className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-medium text-sm">{g.name}</span>
                <span className="ml-2 text-xs text-gray-400">({g.type === 'single' ? 'único' : 'múltiplo'})</span>
              </div>
              {editable && (
                <div className="flex gap-2">
                  <button onClick={() => setShowOption(g.id)} className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-lg">
                    + Opção
                  </button>
                  <button onClick={() => deleteGroupMut.mutate(g.id)} className="text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-1">
              {g.options.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between text-sm">
                  <span>{o.name}</span>
                  <div className="flex items-center gap-2">
                    {Number(o.price) > 0 && <span className="text-green-600 text-xs">+{formatCurrency(Number(o.price))}</span>}
                    {editable && <button onClick={() => deleteOptMut.mutate(o.id)} className="text-red-300"><Trash2 size={12} /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {editable && (
          <button onClick={() => setShowGroup(meal.id)}
            className="w-full border-2 border-dashed border-gray-200 text-gray-400 py-2 rounded-xl text-sm hover:border-orange-300 hover:text-orange-400 transition-colors">
            + Adicionar grupo
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Marmitas</h1>
        <button
          onClick={() => { setMealForm({ ...mealForm, date: selectedDate }); setShowNew(true); }}
          className="bg-orange-500 text-white p-2 rounded-xl hover:bg-orange-600"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
        <button onClick={() => setSelectedDate(shiftDay(selectedDate, -1))} className="p-1 text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="font-medium text-gray-700 border-none outline-none bg-transparent text-sm text-center cursor-pointer"
          />
          {selectedDate === todayStr && <span className="text-xs text-orange-500 font-medium -mt-0.5">Hoje</span>}
        </div>
        <button onClick={() => setSelectedDate(shiftDay(selectedDate, 1))} className="p-1 text-gray-400 hover:text-gray-600">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Meals */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : meals.length > 0 ? (
        <div className="space-y-3">
          {meals.map((m: any) => (
            <div key={m.id} className={`card transition-opacity ${!m.active ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{m.name}</p>
                    {!m.active && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">Inativa</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{formatCurrency(Number(m.basePrice))}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => toggleActiveMut.mutate({ id: m.id, active: !m.active })}
                    title={m.active ? 'Desativar' : 'Ativar'}
                    className={m.active ? 'text-orange-500 hover:text-orange-700' : 'text-gray-400 hover:text-orange-500'}
                  >
                    <Power size={16} />
                  </button>
                  <button
                    onClick={() => setEditTarget({ id: m.id, name: m.name, description: m.description ?? '', basePrice: String(m.basePrice) })}
                    title="Editar"
                    className="text-gray-400 hover:text-gray-700"
                  >
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => openCopy(m)} title="Copiar para outra data" className="text-blue-400 hover:text-blue-600">
                    <Copy size={16} />
                  </button>
                  <button onClick={() => setExpandedMeal(expandedMeal === m.id ? null : m.id)} className="text-gray-400 hover:text-gray-600">
                    {expandedMeal === m.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>
              {expandedMeal === m.id && renderGroups(m, true)}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-center text-gray-400 py-2">Nenhuma marmita cadastrada para este dia</p>
          {prevMeals.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 whitespace-nowrap">Marmitas do dia anterior</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="space-y-3">
                {prevMeals.map((m: any) => (
                  <div key={m.id} className="card">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{m.name}</p>
                        <p className="text-sm text-gray-400">{formatCurrency(Number(m.basePrice))}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <button
                          onClick={() => openCopy(m)}
                          className="flex items-center gap-1 text-xs bg-blue-50 text-blue-500 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                        >
                          <Copy size={13} />
                          Copiar para {selectedDate === todayStr ? 'hoje' : 'este dia'}
                        </button>
                        <button onClick={() => setExpandedMeal(expandedMeal === m.id ? null : m.id)} className="text-gray-400 hover:text-gray-600">
                          {expandedMeal === m.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>
                    {expandedMeal === m.id && renderGroups(m, false)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal: Editar Marmita */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setEditTarget(null)}>
          <div className="bg-white rounded-t-2xl w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Editar Marmita</h2>
              <button onClick={() => setEditTarget(null)}><X size={20} /></button>
            </div>
            <div>
              <label className="label">Nome</label>
              <input className="input" value={editTarget.name}
                onChange={(e) => setEditTarget({ ...editTarget, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Descrição (opcional)</label>
              <input className="input" value={editTarget.description}
                onChange={(e) => setEditTarget({ ...editTarget, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Preço base (R$)</label>
              <input className="input" type="number" step="0.01" min="0" value={editTarget.basePrice}
                onChange={(e) => setEditTarget({ ...editTarget, basePrice: e.target.value })} />
            </div>
            <button className="btn-primary" disabled={editMealMut.isPending}
              onClick={() => editMealMut.mutate({ id: editTarget.id, data: { name: editTarget.name, description: editTarget.description, basePrice: parseFloat(editTarget.basePrice) } })}>
              {editMealMut.isPending ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Copiar Marmita */}
      {copyTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setCopyTarget(null)}>
          <div className="bg-white rounded-t-2xl w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Copiar Marmita</h2>
              <button onClick={() => setCopyTarget(null)}><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-500 font-medium">{copyTarget.name}</p>
            <div>
              <label className="label">Copiar para a data</label>
              <input className="input" type="date" value={copyDate} onChange={(e) => setCopyDate(e.target.value)} />
            </div>
            <button className="btn-primary" disabled={doCopy.isPending}
              onClick={() => doCopy.mutate({ id: copyTarget.id, targetDate: copyDate })}>
              {doCopy.isPending ? 'Copiando...' : 'Confirmar cópia'}
            </button>
          </div>
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
