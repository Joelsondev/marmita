'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { lookupCheckout, confirmPickupByCpf, addCredit } from '@/lib/api';
import { formatCurrency } from '@/lib/cart';
import { Search, QrCode, CheckCircle, XCircle, PlusCircle, Camera, X, AlertTriangle } from 'lucide-react';

function formatCPF(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
}

type CheckoutData = {
  customer: { id: string; name: string; cpf: string; balance: string };
  orders: any[];
  totalDue: number;
  canPickup: boolean;
  missing: number;
};

// ─── QR Scanner ──────────────────────────────────────────────────────────────
function QrScanner({ onDetect, onClose }: { onDetect: (v: string) => void; onClose: () => void }) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const rafRef       = useRef<number>(0);
  const onDetectRef  = useRef(onDetect);
  const frameCounterRef = useRef(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Mantém o ref atualizado sem disparar re-renders
  useEffect(() => { onDetectRef.current = onDetect; }, [onDetect]);

  function stopStream() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // tick não depende de onDetect → useEffect roda apenas uma vez
  const tick = useCallback(async () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    // Timeout se não conseguir ler vídeo após 50 frames
    if (video.readyState < 2) {
      frameCounterRef.current++;
      if (frameCounterRef.current > 50) {
        stopStream();
        setError('Câmera não respondeu. Tente novamente.');
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    frameCounterRef.current = 0;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const jsQR = (await import('jsqr')).default;
    const code  = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
    if (code?.data) { stopStream(); onDetectRef.current(code.data); return; }
    rafRef.current = requestAnimationFrame(tick);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const applyStream = (stream: MediaStream) => {
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setLoading(false);
      rafRef.current = requestAnimationFrame(tick);
    };

    const handleError = (err: any) => {
      console.error('Camera error:', err.name, err.message);
      setLoading(false);
      if (err.name === 'NotAllowedError') {
        setError('Permissão de câmera recusada. Clique no ícone de câmera na barra do navegador e permita o acesso.');
      } else if (err.name === 'NotFoundError') {
        setError('Nenhuma câmera encontrada neste dispositivo.');
      } else {
        setError(`Erro ao acessar câmera: ${err.message}`);
      }
    };

    // Tenta câmera traseira (ideal para mobile), com fallback para qualquer câmera
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      .then(applyStream)
      .catch(() =>
        navigator.mediaDevices
          .getUserMedia({ video: true })
          .then(applyStream)
          .catch(handleError)
      );

    return () => stopStream();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-800 text-sm">Aponte para o QR Code do cliente</p>
        <button onClick={() => { stopStream(); onClose(); }} className="btn-ghost p-1.5 rounded-xl">
          <X size={18} />
        </button>
      </div>
      {error ? (
        <div className="alert-error text-sm">{error}</div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden bg-slate-900">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10">
              <div className="text-white text-center">
                <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm">Iniciando câmera...</p>
              </div>
            </div>
          )}
          <video ref={videoRef} autoPlay playsInline muted className="w-full" style={{ maxHeight: 280 }} />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-52 h-52 border-2 border-brand-400 rounded-3xl opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 via-transparent to-slate-900/20" />
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RetiradaPage() {
  const qc = useQueryClient();

  const [cpf, setCpf]             = useState('');
  const [tab, setTab]             = useState<'cpf' | 'qr'>('qr');
  const [showCamera, setShowCamera] = useState(true);
  const [result, setResult]       = useState<CheckoutData | null>(null);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [showCredit, setShowCredit]     = useState(false);

  const cpfInputRef    = useRef<HTMLInputElement>(null);
  const lastScanWasQr  = useRef(false);

  const lookupMut = useMutation({
    mutationFn: lookupCheckout,
    onSuccess: (data) => {
      setError('');
      setShowCamera(false);
      if (data.canPickup && data.orders.length > 0 && lastScanWasQr.current) {
        autoConfirmPickup(data);
      } else {
        setResult(data);
      }
    },
    onError: (e: any) => {
      setError(e.response?.data?.message || 'Erro ao identificar cliente');
      setResult(null);
      // Reinicia câmera após erro no QR
      if (lastScanWasQr.current) {
        setShowCamera(false);
        setTimeout(() => setShowCamera(true), 400);
      }
    },
  });

  const pickupMut = useMutation({
    mutationFn: (cpf: string) => confirmPickupByCpf(cpf),
    onSuccess: () => {
      setSuccess(true); setResult(null);
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e: any) => setError(e.response?.data?.message || 'Erro ao confirmar retirada'),
  });

  function autoConfirmPickup(data: CheckoutData) {
    pickupMut.mutate(data.customer.cpf);
  }

  const creditMut = useMutation({
    mutationFn: () => addCredit(result!.customer.id, { amount: Number(creditAmount), description: 'Crédito balcão' }),
    onSuccess: () => {
      setShowCredit(false); setCreditAmount('');
      lookupMut.mutate({ cpf: result!.customer.cpf });
    },
    onError: (e: any) => setError(e.response?.data?.message || 'Erro ao adicionar crédito'),
  });

  function handleSearchByCpf() {
    if (cpf.length < 11) return;
    lastScanWasQr.current = false;
    setSuccess(false); setError('');
    lookupMut.mutate({ cpf });
  }

  function handleQrDetect(raw: string) {
    const value = raw.trim();
    lastScanWasQr.current = true;
    setSuccess(false); setError('');

    // Formato atual: token AES hex (100–180 chars, só 0-9 a-f)
    if (/^[0-9a-f]{80,200}$/.test(value)) {
      lookupMut.mutate({ qrToken: value });
      return;
    }
    // Legado: JSON { cpf, id, name }
    try {
      const parsed = JSON.parse(value);
      if (parsed.cpf) { lookupMut.mutate({ cpf: parsed.cpf }); return; }
    } catch { /* não é JSON */ }
    // Fallback: CPF puro
    if (/^\d{11}$/.test(value)) {
      lookupMut.mutate({ cpf: value });
      return;
    }
    setError('QR Code inválido');
  }

  function reset() {
    setResult(null); setError(''); setSuccess(false);
    setCpf(''); setShowCamera(true); setTab('qr'); setShowCredit(false);
    setTimeout(() => cpfInputRef.current?.focus(), 50);
  }

  return (
    <div className="page">
      <h1 className="page-title pt-2 text-center">Retirada de Marmita</h1>

      {/* ── Sucesso ── */}
      {success && (
        <div className="card-elevated bg-emerald-50 border border-emerald-200 text-center py-10 space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="text-emerald-500" size={36} />
          </div>
          <div>
            <p className="font-extrabold text-emerald-700 text-2xl">Retirada confirmada!</p>
            <p className="text-emerald-600 text-sm mt-1">Marmita liberada com sucesso</p>
          </div>
          <button onClick={reset} className="btn-primary max-w-xs mx-auto">Nova retirada</button>
        </div>
      )}

      {/* ── Busca ── */}
      {!success && !result && (
        <>
          {/* Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => { setTab('cpf'); setShowCamera(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${tab === 'cpf' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              <Search size={15} /> Por CPF
            </button>
            <button
              onClick={() => { setTab('qr'); setShowCamera(true); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${tab === 'qr' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              <QrCode size={15} /> QR Code
            </button>
          </div>

          {/* CPF */}
          {tab === 'cpf' && (
            <div className="card space-y-3">
              <label className="label">CPF do cliente</label>
              <input
                ref={cpfInputRef}
                autoFocus
                className="input text-xl tracking-widest text-center font-mono"
                placeholder="000.000.000-00"
                inputMode="numeric"
                value={formatCPF(cpf)}
                onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchByCpf()}
              />
              <button
                onClick={handleSearchByCpf}
                disabled={cpf.length < 11 || lookupMut.isPending}
                className="btn-primary">
                {lookupMut.isPending ? 'Buscando…' : 'Buscar cliente'}
              </button>
            </div>
          )}

          {/* QR */}
          {tab === 'qr' && (
            <div className="space-y-3">
              {showCamera ? (
                <QrScanner onDetect={handleQrDetect} onClose={() => { setShowCamera(false); setTab('cpf'); }} />
              ) : (
                <button
                  onClick={() => setShowCamera(true)}
                  className="card w-full py-12 flex flex-col items-center gap-3 text-brand-500 hover:bg-brand-50 transition-colors border-2 border-dashed border-brand-200 cursor-pointer">
                  <Camera size={44} />
                  <span className="font-bold text-lg">Abrir câmera</span>
                  <span className="text-xs text-slate-400">Escanear QR Code do cliente</span>
                </button>
              )}
              <p className="text-xs text-slate-400 text-center">
                QR Code disponível na área do cliente em <strong>Meu QR Code</strong>
              </p>
            </div>
          )}

          {lookupMut.isPending && tab === 'qr' && (
            <div className="card text-center text-slate-500 text-sm">Identificando cliente…</div>
          )}

          {error && (
            <div className="alert-error">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </>
      )}

      {/* ── Resultado ── */}
      {result && !success && (
        <div className="space-y-3">
          {/* Customer card */}
          <div className="card-elevated">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-extrabold text-xl text-slate-900">{result.customer.name}</p>
                <p className="text-sm text-slate-400 font-mono mt-0.5">{formatCPF(result.customer.cpf)}</p>
              </div>
              <button onClick={reset} className="btn-ghost p-1.5 rounded-xl mt-0.5">
                <X size={20} />
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm text-slate-500">Saldo disponível</span>
              <span className={`text-3xl font-extrabold ${result.canPickup ? 'text-emerald-600' : 'text-rose-500'}`}>
                {formatCurrency(Number(result.customer.balance))}
              </span>
            </div>
          </div>

          {/* Orders */}
          {result.orders.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-slate-400">Nenhum pedido pendente para hoje</p>
            </div>
          ) : (
            <div className="card space-y-4">
              <p className="section-title">Pedidos de hoje</p>
              {result.orders.map((order: any, idx: number) => (
                <div key={order.id} className={result.orders.length > 1 ? 'pb-3 border-b border-slate-100 last:border-0 last:pb-0' : ''}>
                  {result.orders.length > 1 && <p className="text-xs text-slate-400 mb-1.5">Pedido {idx + 1}</p>}
                  {order.items.map((item: any) => (
                    <div key={item.id} className="text-sm mb-1.5">
                      <div className="flex justify-between text-slate-800">
                        <span className="font-semibold">{item.quantity}× {item.meal.name}</span>
                        <span className="font-semibold">{formatCurrency(Number(item.unitPrice) * item.quantity)}</span>
                      </div>
                      {item.options.map((opt: any) => (
                        <p key={opt.id} className="text-slate-400 pl-3 text-xs mt-0.5">· {opt.option.name}</p>
                      ))}
                    </div>
                  ))}
                  {Number(order.discount) > 0 && (
                    <div className="flex justify-between text-xs text-emerald-600 font-semibold mt-1">
                      <span>Desconto</span>
                      <span>−{formatCurrency(Number(order.discount))}</span>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex justify-between font-bold text-base border-t border-slate-100 pt-3">
                <span className="text-slate-700">Total a pagar</span>
                <span className="text-brand-500">{formatCurrency(result.totalDue)}</span>
              </div>
            </div>
          )}

          {/* Action */}
          {result.orders.length > 0 && (
            <>
              {!result.canPickup ? (
                <div className="card border border-rose-200 bg-rose-50 space-y-4">
                  <div className="flex items-center gap-3 text-rose-600">
                    <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <XCircle size={20} />
                    </div>
                    <div>
                      <p className="font-bold">Saldo insuficiente</p>
                      <p className="text-rose-500 text-xs">
                        Faltam <strong className="text-rose-700">{formatCurrency(result.missing)}</strong>
                      </p>
                    </div>
                  </div>

                  {showCredit ? (
                    <div className="space-y-3 pt-2 border-t border-rose-200">
                      <p className="text-sm font-semibold text-slate-700">Adicionar crédito ao cliente</p>
                      <input autoFocus type="number" className="input" placeholder="Valor em R$"
                        min="0.01" step="0.50" value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && creditMut.mutate()} />
                      <div className="flex gap-2">
                        <button onClick={() => setShowCredit(false)} className="btn-secondary flex-1">Cancelar</button>
                        <button
                          onClick={() => creditMut.mutate()}
                          disabled={!creditAmount || Number(creditAmount) <= 0 || creditMut.isPending}
                          className="btn-primary flex-1">
                          {creditMut.isPending ? 'Salvando…' : 'Confirmar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setShowCredit(true)}
                        className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition-colors">
                        <PlusCircle size={17} /> Adicionar crédito
                      </button>
                      <button
                        onClick={reset}
                        className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-semibold transition-colors">
                        <XCircle size={17} /> Bloquear retirada
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="alert-success">
                    <CheckCircle size={16} className="shrink-0" />
                    <span className="font-semibold">Saldo suficiente — pode retirar!</span>
                  </div>
                  <button
                    onClick={() => pickupMut.mutate(result!.customer.cpf)}
                    disabled={pickupMut.isPending}
                    className="w-full py-5 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl font-extrabold text-xl shadow-[0_4px_16px_rgba(16,185,129,0.35)] hover:shadow-[0_8px_28px_rgba(16,185,129,0.45)] hover:-translate-y-px transition-all duration-200 disabled:opacity-50">
                    {pickupMut.isPending ? 'Confirmando…' : '✓ CONFIRMAR RETIRADA'}
                  </button>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="alert-error">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
