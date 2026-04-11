import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-600 to-brand-700 flex flex-col items-center justify-center p-6 text-white">
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🍱</div>
        <h1 className="text-4xl font-bold mb-2">Gestão Marmita</h1>
        <p className="text-brand-100 text-lg">Sistema completo para marmitarias</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <Link href="/admin/login"
          className="block bg-white text-brand-600 font-bold text-xl py-4 px-8 rounded-2xl text-center shadow-lg hover:shadow-xl transition-shadow">
          Sou Marmitaria (Admin)
        </Link>
        <Link href="/login"
          className="block bg-brand-400 text-white font-bold text-xl py-4 px-8 rounded-2xl text-center shadow-lg hover:shadow-xl transition-shadow border-2 border-brand-300">
          Sou Cliente
        </Link>
      </div>

      <p className="mt-8 text-brand-200 text-sm">
        Ainda não tem conta?{' '}
        <Link href="/registro" className="underline text-white font-medium">Cadastre sua marmitaria</Link>
      </p>
    </div>
  );
}
