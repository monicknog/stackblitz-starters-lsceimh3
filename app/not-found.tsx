import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500 mb-3">
          404
        </h1>
        <h2 className="text-2xl font-semibold text-white mb-2">Página não encontrada</h2>
        <p className="text-gray-400 mb-6">
          A página que você está procurando não existe ou foi removida.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
        >
          Voltar para a home
        </Link>
      </div>
    </div>
  );
}
