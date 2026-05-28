import {
  aplicarReservasEmDisponiveis,
  contarReservasPendentesPorFigurinha,
  listarDisponiveisParaTroca,
  listarFigurinhasFaltando,
  listaFigurinhas,
  obterAlbumTitulo,
} from '../lib/album';
import { carregarAlbumDoBanco, listarInteressesDeTroca } from '../lib/album-db';
import { TrocasPageClient } from './TrocasPageClient';

interface PageProps {
  searchParams?: {
    s?: string;
    album?: string;
  };
}

export default async function TrocasPage({ searchParams }: PageProps) {
  void searchParams;
  const album = await carregarAlbumDoBanco();
  const interesses = await listarInteressesDeTroca();
  const reservasPendentesPorId = contarReservasPendentesPorFigurinha(interesses);
  const disponiveisBase = listarDisponiveisParaTroca(album);
  const disponiveis = aplicarReservasEmDisponiveis(disponiveisBase, reservasPendentesPorId);
  const faltando = listarFigurinhasFaltando(album);

  const totalDisponiveis = disponiveis.reduce(
    (acumulado, figurinha) => acumulado + figurinha.disponiveisParaTroca,
    0,
  );
  const potencialTroca = faltando.length > 0 ? (totalDisponiveis / faltando.length) * 100 : 0;
  const secoesComDeficit = Array.from(
    listaFigurinhas.reduce((mapa, fig) => {
      const secao = fig.secao || 'Sem secao';
      const atual = mapa.get(secao) ?? { total: 0, preenchidas: 0 };
      atual.total += 1;
      if ((album[fig.id]?.obtidas || 0) > 0) {
        atual.preenchidas += 1;
      }
      mapa.set(secao, atual);
      return mapa;
    }, new Map<string, { total: number; preenchidas: number }>()),
  )
    .map(([secao, dados]) => ({
      secao,
      faltantes: dados.total - dados.preenchidas,
      percentual: dados.total > 0 ? (dados.preenchidas / dados.total) * 100 : 0,
    }))
    .filter((item) => item.faltantes > 0)
    .sort((a, b) => b.faltantes - a.faltantes)
    .slice(0, 3);

  void potencialTroca;
  void secoesComDeficit;

  return (
    <TrocasPageClient
      titulo={obterAlbumTitulo()}
      disponiveis={disponiveis}
      faltando={faltando}
      totalDisponiveis={totalDisponiveis}
      totalAlbum={listaFigurinhas.length}
    />
  );
}
