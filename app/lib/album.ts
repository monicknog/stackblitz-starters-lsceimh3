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