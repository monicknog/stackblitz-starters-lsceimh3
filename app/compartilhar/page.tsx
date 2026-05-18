import { FigurinhaCard } from '../components/FigurinhaCard';
import {
  desserializarAlbumDoLink,
  listaFigurinhas,
  obterAlbumTitulo,
} from '../lib/album';
import { carregarAlbumDoBanco } from '../lib/album-db';

interface PageProps {
  searchParams?: {
    album?: string;
  };
}

export default async function SharePage({ searchParams }: PageProps) {
  const albumDoLink = desserializarAlbumDoLink(searchParams?.album);
  const album =
    searchParams?.album && Object.keys(albumDoLink).length > 0
      ? albumDoLink
      : await carregarAlbumDoBanco();

  const estatisticas = listaFigurinhas.reduce(
    (acumulado, figurinha) => {
      const qtd = album[figurinha.id]?.obtidas || 0;

      if (qtd > 0) acumulado.preenchidas += 1;
      if (qtd > 1) acumulado.repetidas += qtd - 1;

      return acumulado;
    },
    {
      total: listaFigurinhas.length,
      preenchidas: 0,
      repetidas: 0,
    },
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-gray-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 sm:mb-8 rounded-3xl border border-gray-800 bg-gray-900/70 backdrop-blur px-5 py-6 sm:px-6 sm:py-7 shadow-2xl shadow-black/20 text-center">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500">
              {obterAlbumTitulo()}
            </h1>
            <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
              Visualização pública do álbum. Esta página mostra apenas o que foi marcado,
              sem permitir edição.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 max-w-2xl mx-auto">
            <div className="bg-gray-800/80 p-3 rounded-2xl border border-gray-700 text-center">
              <span className="text-xs text-gray-400 block uppercase font-bold">
                Total
              </span>
              <span className="text-xl font-bold text-blue-400">
                {estatisticas.total}
              </span>
            </div>
            <div className="bg-gray-800/80 p-3 rounded-2xl border border-gray-700 text-center">
              <span className="text-xs text-gray-400 block uppercase font-bold">
                Tenho
              </span>
              <span className="text-xl font-bold text-green-400">
                {estatisticas.preenchidas}
              </span>
            </div>
            <div className="bg-gray-800/80 p-3 rounded-2xl border border-gray-700 text-center">
              <span className="text-xs text-gray-400 block uppercase font-bold">
                Faltam
              </span>
              <span className="text-xl font-bold text-red-400">
                {estatisticas.total - estatisticas.preenchidas}
              </span>
            </div>
          </div>
        </header>

        <main>
          <div className="mb-4 text-center sm:text-left">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-200">
              Figurinhas visíveis no link
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Quem recebeu o link consegue ver somente estas figurinhas e suas quantidades.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {listaFigurinhas.map((fig) => (
              <FigurinhaCard
                key={fig.id}
                fig={fig}
                qtd={album[fig.id]?.obtidas || 0}
                readOnly
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}