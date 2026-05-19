import dadosAlbum from '../../src/figurinhas-album.json';
import type { Figurinha } from '../components/FigurinhaCard';

export interface EstadoFigurinhas {
  [id: string]: {
    obtidas: number;
  };
}

export interface FigurinhaComTroca extends Figurinha {
  obtidas: number;
  disponiveisParaTroca: number;
}

export interface InteresseTroca {
  id: string;
  nome: string;
  figurinhaDesejadaId: string;
  figurinhaDesejadaNome: string;
  figurinhaOfertadaId: string;
  figurinhaOfertadaNome: string;
  status: 'pendente' | 'rejeitado' | 'aceito';
  createdAt: string;
  updatedAt?: string;
  rejectedAt?: string | null;
  acceptedAt?: string | null;
}

export const SENHA_PRINCIPAL = 'copanogs26';

export const listaFigurinhas = (dadosAlbum as any[])
  .map(({ ordem_album, tipojogador, tipoJogador, ...rest }: any) => ({
    ...rest,
    tipoJogador: tipoJogador ?? tipojogador ?? undefined,
  })) as Figurinha[];

export function serializarAlbumParaLink(album: EstadoFigurinhas) {
  return Object.entries(album)
    .filter(([, valor]) => valor.obtidas > 0)
    .map(([id, valor]) => `${id}:${valor.obtidas}`)
    .join(',');
}

export function listarDisponiveisParaTroca(album: EstadoFigurinhas) {
  return listaFigurinhas
    .map((figurinha) => {
      const obtidas = album[figurinha.id]?.obtidas || 0;
      const disponiveisParaTroca = Math.max(0, obtidas - 1);

      return {
        ...figurinha,
        obtidas,
        disponiveisParaTroca,
      } satisfies FigurinhaComTroca;
    })
    .filter((figurinha) => figurinha.disponiveisParaTroca > 0) as FigurinhaComTroca[];
}

export function aplicarReservasEmDisponiveis(
  disponiveis: FigurinhaComTroca[],
  reservasPendentesPorId: Record<string, number>,
) {
  return disponiveis
    .map((figurinha) => {
      const reservado = reservasPendentesPorId[figurinha.id] || 0;
      return {
        ...figurinha,
        disponiveisParaTroca: Math.max(0, figurinha.disponiveisParaTroca - reservado),
      } satisfies FigurinhaComTroca;
    })
    .filter((figurinha) => figurinha.disponiveisParaTroca > 0) as FigurinhaComTroca[];
}

export function listarFigurinhasFaltando(album: EstadoFigurinhas) {
  return listaFigurinhas.filter((figurinha) => (album[figurinha.id]?.obtidas || 0) === 0);
}

export function contarReservasPendentesPorFigurinha(interesses: InteresseTroca[]) {
  return interesses.reduce<Record<string, number>>((acumulado, interesse) => {
    if (interesse.status !== 'pendente') return acumulado;

    acumulado[interesse.figurinhaDesejadaId] = (acumulado[interesse.figurinhaDesejadaId] || 0) + 1;
    return acumulado;
  }, {});
}

export function desserializarAlbumDoLink(valor: string | string[] | undefined) {
  if (!valor || Array.isArray(valor)) {
    return {} as EstadoFigurinhas;
  }

  return valor.split(',').reduce<EstadoFigurinhas>((acumulado, item) => {
    const [id, quantidadeTexto] = item.split(':');
    const obtidas = Number.parseInt(quantidadeTexto || '0', 10);

    if (!id || !Number.isFinite(obtidas) || obtidas <= 0) {
      return acumulado;
    }

    acumulado[id] = { obtidas };
    return acumulado;
  }, {});
}

export function obterAlbumTitulo() {
  return 'Álbum Copa';
}