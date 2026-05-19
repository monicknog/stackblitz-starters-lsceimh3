import { FigurinhaCard } from '../components/FigurinhaCard';
import { ShareFilter } from './ShareFilter';
import { ShareLiveStats } from './ShareLiveStats';
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
  // Always read the persisted album from the database so public view
  // matches the protected main page's persisted state.
  const album = await carregarAlbumDoBanco();

  const estatisticas = listaFigurinhas.reduce(
    (acumulado, figurinha) => {
      const raw = album[figurinha.id]?.obtidas ?? album[figurinha.id] ?? 0;
      const qtd = Number(raw) || 0;

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
            <p className="text-xs text-gray-500 mt-2 max-w-2xl mx-auto">
              Nota: os números mostrados (Total / Tenho / Faltam) refletem o álbum
              salvo no banco de dados. Para atualizar estes valores publique/registre
              suas alterações na página principal e use "Copiar link público".
            </p>
          </div>

          <ShareLiveStats />
        </header>

        <main>
          <div className="mb-4 text-center sm:text-left">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-200">
              Figurinhas visíveis no link
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Quem recebeu o link consegue filtrar entre figurinhas que você tem e as que estão faltando.
            </p>
          </div>

          <ShareFilter lista={listaFigurinhas} album={album} />
        </main>
      </div>
    </div>
  );
}