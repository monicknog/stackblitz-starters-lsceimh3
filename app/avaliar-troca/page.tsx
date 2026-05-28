import { listaFigurinhas } from '../lib/album';
import { listarFigurinhasFaltando } from '../lib/album';
import { carregarAlbumDoBanco } from '../lib/album-db';
import { AvaliarTrocaClient } from './AvaliarTrocaClient';

export const dynamic = 'force-dynamic';

export default async function AvaliarTrocaPage() {
  const album = await carregarAlbumDoBanco();
  const figurinhas = listaFigurinhas.map((f) => ({
    id: f.id,
    jogador: f.jogador,
    pais: f.pais,
    secao: f.secao,
    tipo: f.tipo,
  }));
  const pendentesSemCocaCola = listarFigurinhasFaltando(album)
    .filter((f) => !f.id.startsWith('CC'))
    .map((f) => f.id);

  return <AvaliarTrocaClient figurinhas={figurinhas} pendentesSemCocaCola={pendentesSemCocaCola} />;
}
