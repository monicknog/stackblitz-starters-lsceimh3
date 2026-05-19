import { FigurinhaCard } from '../components/FigurinhaCard';
import {
  aplicarReservasEmDisponiveis,
  contarReservasPendentesPorFigurinha,
  desserializarAlbumDoLink,
  listarDisponiveisParaTroca,
  listarFigurinhasFaltando,
  listaFigurinhas,
  obterAlbumTitulo,
} from '../lib/album';
import { carregarAlbumDoBanco, listarInteressesDeTroca } from '../lib/album-db';
import { InteresseTrocaForm } from './InteresseTrocaForm';
import { TrocasFilter } from './TrocasFilter';

interface PageProps {
  searchParams?: {
    album?: string;
  };
}

export default async function TrocasPage({ searchParams }: PageProps) {
  const albumDoLink = desserializarAlbumDoLink(searchParams?.album);
  const album =
    searchParams?.album && Object.keys(albumDoLink).length > 0
      ? albumDoLink
      : await carregarAlbumDoBanco();
  const interesses = await listarInteressesDeTroca();
  const reservasPendentesPorId = contarReservasPendentesPorFigurinha(interesses);
  const disponiveisBase = listarDisponiveisParaTroca(album);
  const disponiveis = aplicarReservasEmDisponiveis(disponiveisBase, reservasPendentesPorId);
  const faltando = listarFigurinhasFaltando(album);

  const totalDisponiveis = disponiveis.reduce(
    (acumulado, figurinha) => acumulado + figurinha.disponiveisParaTroca,
    0,
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-gray-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 sm:mb-8 rounded-3xl border border-gray-800 bg-gray-900/70 backdrop-blur px-5 py-6 sm:px-6 sm:py-7 shadow-2xl shadow-black/20 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            {obterAlbumTitulo()}
          </h1>
          <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
            Estas são as figurinhas disponíveis para troca neste álbum. Quem quiser,
            pode registrar interesse escolhendo uma figurinha que está faltando para você.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 max-w-2xl mx-auto">
            <div className="bg-gray-800/80 p-3 rounded-2xl border border-gray-700 text-center">
              <span className="text-xs text-gray-400 block uppercase font-bold">
                Figurinhas para trocar
              </span>
              <span className="text-xl font-bold text-emerald-400">
                {disponiveis.length}
              </span>
            </div>
            <div className="bg-gray-800/80 p-3 rounded-2xl border border-gray-700 text-center">
              <span className="text-xs text-gray-400 block uppercase font-bold">
                Unidades disponíveis
              </span>
              <span className="text-xl font-bold text-cyan-400">
                {totalDisponiveis}
              </span>
            </div>
            <div className="bg-gray-800/80 p-3 rounded-2xl border border-gray-700 text-center">
              <span className="text-xs text-gray-400 block uppercase font-bold">
                Total do álbum
              </span>
              <span className="text-xl font-bold text-blue-400">
                {listaFigurinhas.length}
              </span>
            </div>
          </div>
        </header>

        <InteresseTrocaForm disponiveis={disponiveis} faltando={faltando} />

        <TrocasFilter
          disponiveis={disponiveis}
          totalDisponiveis={totalDisponiveis}
          listaFigurinhasLength={listaFigurinhas.length}
        />
      </div>
    </div>
  );
}