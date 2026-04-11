'use client';
import { getUser } from '@/lib/auth';
import { QRCodeSVG } from 'qrcode.react';
import { formatCurrency } from '@/lib/cart';

function formatCPF(v: string) {
  return v?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '';
}

export default function QRCodePage() {
  const user = getUser();

  if (!user) return null;

  const qrData = JSON.stringify({ cpf: user.cpf, id: user.id, name: user.name });

  return (
    <div className="p-4 flex flex-col items-center gap-6 min-h-[80vh] justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-1">Seu QR Code</h1>
        <p className="text-gray-400 text-sm">Mostre para retirar sua marmita</p>
      </div>

      {/* QR Code */}
      <div className="bg-white p-6 rounded-3xl shadow-lg border-4 border-orange-100">
        <QRCodeSVG value={qrData} size={220} level="H"
          imageSettings={{ src: '', x: undefined, y: undefined, height: 0, width: 0, excavate: false }} />
      </div>

      {/* User info */}
      <div className="card w-full text-center space-y-1">
        <p className="text-xl font-bold">{user.name}</p>
        <p className="text-gray-400 font-mono tracking-wider">{formatCPF(user.cpf)}</p>
        <p className="text-2xl font-bold text-green-600">{formatCurrency(Number(user.balance))}</p>
        <p className="text-xs text-gray-400">saldo disponível</p>
      </div>

      <p className="text-center text-gray-400 text-sm max-w-xs">
        A marmitaria escaneará este código ou buscará seu CPF para confirmar a retirada.
      </p>
    </div>
  );
}
