import { carregarAlbumDoBanco } from '../lib/album-db';
import { listaFigurinhas } from '../lib/album';
import { FaltantesResumoClient } from './FaltantesResumoClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function ordenaCodigo(a: string, b: string) {
  const ma = a.match(/^(.*)_(\d+)$/);
  const mb = b.match(/^(.*)_(\d+)$/);
  if (ma && mb && ma[1] === mb[1]) {
    return Number(ma[2]) - Number(mb[2]);
  }
  return a.localeCompare(b, 'pt-BR');
}

export default async function FaltantesResumoPage() {
  const album = await carregarAlbumDoBanco();

  const mapa = new Map<string, string[]>();
  const nomeSelecao = new Map<string, string>();
  const ordemSelecao = new Map<string, number>();
  const faltantesFWC: string[] = [];
  const faltantesCC: string[] = [];

  listaFigurinhas.forEach((f, idx) => {
    const qtd = album[f.id]?.obtidas || 0;
    if (qtd > 0) return;

    if (f.id.startsWith('FWC_')) {
      faltantesFWC.push(f.id);
      return;
    }

    if (f.id.startsWith('CC')) {
      faltantesCC.push(f.id);
      return;
    }

    const selecao = f.sigla || f.pais || 'OUTROS';
    if (!nomeSelecao.has(selecao)) {
      nomeSelecao.set(selecao, f.pais || selecao);
    }
    if (!ordemSelecao.has(selecao)) {
      ordemSelecao.set(selecao, idx);
    }
    const atual = mapa.get(selecao) ?? [];
    atual.push(f.id);
    mapa.set(selecao, atual);
  });

  const linhas = Array.from(mapa.entries())
    .map(([selecao, codigos]) => ({
      selecao,
      selecaoLabel: `${selecao} - ${nomeSelecao.get(selecao) || selecao}`,
      codigos: codigos.sort(ordenaCodigo),
      ordemAlbum: ordemSelecao.get(selecao) ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a.selecao.localeCompare(b.selecao, 'pt-BR'));

  linhas.push({
    selecao: 'FWC',
    selecaoLabel: 'FWC - Especiais',
    codigos: faltantesFWC.sort(ordenaCodigo),
    ordemAlbum: Number.MAX_SAFE_INTEGER - 1,
  });

  linhas.push({
    selecao: 'COCA-COLA',
    selecaoLabel: 'COCA-COLA - Coleção',
    codigos: faltantesCC.sort(ordenaCodigo),
    ordemAlbum: Number.MAX_SAFE_INTEGER,
  });

  return <FaltantesResumoClient linhas={linhas} />;
}
