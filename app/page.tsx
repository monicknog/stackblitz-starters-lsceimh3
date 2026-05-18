'use client';

import { useState, useEffect, useMemo } from 'react';
import dadosAlbum from '../src/figurinhas-com-jogadores.json';
import { FigurinhaCard, type Figurinha } from './components/FigurinhaCard';

interface EstadoFigurinhas {
  [id: string]: {
    obtidas: number;
  };
}

// remove `imagem` field (URL) from items before exposing them to the client
const listaFigurinhas = (dadosAlbum.lista_figurinhas as any).map(({ imagem, ...rest }: any) => rest) as Figurinha[];

export default function Home() {
  const [album, setAlbum] = useState<EstadoFigurinhas>({});
  const [filtroStatus, setFiltroStatus] = useState<
    'todas' | 'preenchidas' | 'faltantes' | 'repetidas'
  >('todas');
  const [filtroSecao, setFiltroSecao] = useState<string>('todas');
  const [busca, setBusca] = useState<string>('');

  useEffect(() => {
    const dadosSalvos = localStorage.getItem('album_copa_2026');
    if (dadosSalvos) {
      setAlbum(JSON.parse(dadosSalvos));
    }
  }, []);

  const salvarAlbum = (novoEstado: EstadoFigurinhas) => {
    setAlbum(novoEstado);
    localStorage.setItem('album_copa_2026', JSON.stringify(novoEstado));
  };

  const adicionarFigurinha = (id: string) => {
    const atual = album[id]?.obtidas || 0;
    salvarAlbum({ ...album, [id]: { obtidas: atual + 1 } });
  };

  const removerFigurinha = (id: string) => {
    const atual = album[id]?.obtidas || 0;
    if (atual === 0) return;
    salvarAlbum({ ...album, [id]: { obtidas: atual - 1 } });
  };

  const secoesDisponiveis = useMemo(() => {
    const secoes = new Set(listaFigurinhas.map((f) => f.secao));
    return ['todas', ...Array.from(secoes)];
  }, []);

  const estatisticas = useMemo(() => {
    let preenchidas = 0;
    let repetidas = 0;
    const total = listaFigurinhas.length;

    listaFigurinhas.forEach((f) => {
      const qtd = album[f.id]?.obtidas || 0;
      if (qtd > 0) preenchidas++;
      if (qtd > 1) repetidas += qtd - 1;
    });

    return { total, preenchidas, faltantes: total - preenchidas, repetidas };
  }, [album]);

  const figurinhasFiltradas = useMemo(() => {
    return listaFigurinhas.filter((f) => {
      const qtd = album[f.id]?.obtidas || 0;
      const termo = busca.toLowerCase().trim();

      if (termo) {
        const bateComBusca =
          f.id.toLowerCase().includes(termo) ||
          f.numero.toLowerCase().includes(termo) ||
          (f.pais && f.pais.toLowerCase().includes(termo)) ||
          (f.jogador && f.jogador.toLowerCase().includes(termo)) ||
          (f.secao && f.secao.toLowerCase().includes(termo));

        if (!bateComBusca) return false;
      }

      if (filtroSecao !== 'todas' && f.secao !== filtroSecao) return false;

      if (filtroStatus === 'preenchidas' && qtd === 0) return false;
      if (filtroStatus === 'faltantes' && qtd > 0) return false;
      if (filtroStatus === 'repetidas' && qtd <= 1) return false;

      return true;
    });
  }, [album, filtroStatus, filtroSecao, busca]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 border-b border-gray-800 pb-6 text-center lg:text-left lg:flex lg:justify-between lg:items-center">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500">
              {dadosAlbum.album}
            </h1>
            <p className="text-gray-400 mt-1">
              Gerenciador Pessoal de Figurinhas
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 lg:mt-0">
            <div className="bg-gray-800 p-3 rounded-xl border border-gray-700 text-center">
              <span className="text-xs text-gray-400 block uppercase font-bold">
                Total
              </span>
              <span className="text-xl font-bold text-blue-400">
                {estatisticas.total}
              </span>
            </div>
            <div className="bg-gray-800 p-3 rounded-xl border border-gray-700 text-center">
              <span className="text-xs text-gray-400 block uppercase font-bold">
                Tenho
              </span>
              <span className="text-xl font-bold text-green-400">
                {estatisticas.preenchidas} (
                {(
                  (estatisticas.preenchidas / estatisticas.total) *
                  100
                ).toFixed(1)}
                %)
              </span>
            </div>
            <div className="bg-gray-800 p-3 rounded-xl border border-gray-700 text-center">
              <span className="text-xs text-gray-400 block uppercase font-bold">
                Faltam
              </span>
              <span className="text-xl font-bold text-red-400">
                {estatisticas.faltantes}
              </span>
            </div>
            <div className="bg-gray-800 p-3 rounded-xl border border-gray-700 text-center">
              <span className="text-xs text-gray-400 block uppercase font-bold">
                Repetidas
              </span>
              <span className="text-xl font-bold text-yellow-400">
                {estatisticas.repetidas}
              </span>
            </div>
          </div>
        </header>

        <section className="bg-gray-800 p-4 rounded-2xl border border-gray-700 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
              Buscar jogador, código ou país:
            </label>
            <input
              type="text"
              placeholder="Ex: Alisson, BRA_10, México..."
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
              Filtrar por Status:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['todas', 'Todas', 'bg-red-600'],
                  ['preenchidas', 'Preenchidas', 'bg-green-600'],
                  ['faltantes', 'Faltantes', 'bg-indigo-600'],
                  ['repetidas', 'Repetidas (Troca)', 'bg-yellow-600'],
                ] as const
              ).map(([valor, label, ativo]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setFiltroStatus(valor)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filtroStatus === valor
                      ? `${ativo} ${valor === 'repetidas' ? 'text-gray-900' : 'text-white'}`
                      : 'bg-gray-900 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
              Seção do Álbum:
            </label>
            <select
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 capitalize"
              value={filtroSecao}
              onChange={(e) => setFiltroSecao(e.target.value)}
            >
              {secoesDisponiveis.map((sec) => (
                <option key={sec} value={sec}>
                  {sec === 'todas' ? 'Todas as Seções' : sec}
                </option>
              ))}
            </select>
          </div>
        </section>

        <main>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-300">
              Figurinhas Encontradas ({figurinhasFiltradas.length})
            </h2>
          </div>

          {figurinhasFiltradas.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-2xl border border-dashed border-gray-700">
              <p className="text-gray-400">
                Nenhuma figurinha corresponde aos filtros aplicados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {figurinhasFiltradas.map((fig) => (
                <FigurinhaCard
                  key={fig.id}
                  fig={fig}
                  qtd={album[fig.id]?.obtidas || 0}
                  onAdicionar={() => adicionarFigurinha(fig.id)}
                  onRemover={() => removerFigurinha(fig.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}



