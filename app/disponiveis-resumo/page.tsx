import {
  aplicarReservasEmDisponiveis,
  contarReservasPendentesPorFigurinha,
  listarDisponiveisParaTroca,
  listaFigurinhas,
} from '../lib/album';
import { carregarAlbumDoBanco, listarInteressesDeTroca } from '../lib/album-db';
import { DisponiveisResumoClient } from './DisponiveisResumoClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DisponiveisResumoPage() {
  const album = await carregarAlbumDoBanco();
  const interesses = await listarInteressesDeTroca();
  const reservasPendentesPorId = contarReservasPendentesPorFigurinha(interesses);
  const disponiveisBase = listarDisponiveisParaTroca(album);
  const disponiveis = aplicarReservasEmDisponiveis(disponiveisBase, reservasPendentesPorId);

  const mapa = new Map<string, { pais: string; itens: Array<{ codigo: string; quantidade: number }> }>();
  const ordemSelecao = new Map<string, number>();

  listaFigurinhas.forEach((f, idx) => {
    const selecao = f.sigla || f.pais || 'OUTROS';
    if (!ordemSelecao.has(selecao)) {
      ordemSelecao.set(selecao, idx);
    }
  });

  disponiveis.forEach((f) => {
    const selecao = f.sigla || f.pais || 'OUTROS';
    const pais = f.pais || selecao;
    const atual = mapa.get(selecao) ?? { pais, itens: [] };
    atual.itens.push({ codigo: f.id, quantidade: f.disponiveisParaTroca });
    mapa.set(selecao, atual);
  });

  const linhas = Array.from(mapa.entries())
    .map(([selecao, data]) => ({
      selecao,
      selecaoLabel: `${selecao} - ${data.pais}`,
      itens: data.itens.sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR')),
      ordemAlbum: ordemSelecao.get(selecao) ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a.selecao.localeCompare(b.selecao, 'pt-BR'));

  return <DisponiveisResumoClient linhas={linhas} />;
}
