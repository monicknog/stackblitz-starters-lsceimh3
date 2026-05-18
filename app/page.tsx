'use client';

import { useState, useEffect, useMemo } from 'react';
import dadosAlbum from '../src/figurinhas.json';

// Definição dos tipos com base no seu JSON
interface Figunha {
  id: string;
  secao: string;
  numero: string;
  tipo: string;
  pais?: string;
  sigla?: string;
}

interface EstadoFigurinhas {
  [id: string]: {
    obtidas: number;
  };
}

export default function Home() {
  const [album, setAlbum] = useState<EstadoFigurinhas>({});
  const [filtroStatus, setFiltroStatus] = useState<
    'todas' | 'preenchidas' | 'faltantes' | 'repetidas'
  >('todas');
  const [filtroSecao, setFiltroSecao] = useState<string>('todas');
  const [busca, setBusca] = useState<string>('');

  // Carregar dados salvos no navegador ao iniciar
  useEffect(() => {
    const dadosSalvos = localStorage.getItem('album_copa_2026');
    if (dadosSalvos) {
      setAlbum(JSON.parse(dadosSalvos));
    }
  }, []);

  // Salvar no localStorage sempre que o álbum mudar
  const salvarAlbum = (novoEstado: EstadoFigurinhas) => {
    setAlbum(novoEstado);
    localStorage.setItem('album_copa_2026', JSON.stringify(novoEstado));
  };

  // Funções para alterar a quantidade de figurinhas
  const adicionarFigurinha = (id: string) => {
    const atual = album[id]?.obtidas || 0;
    const novoEstado = { ...album, [id]: { obtidas: atual + 1 } };
    salvarAlbum(novoEstado);
  };

  const removerFigurinha = (id: string) => {
    const atual = album[id]?.obtidas || 0;
    if (atual === 0) return;
    const novoEstado = { ...album, [id]: { obtidas: atual - 1 } };
    salvarAlbum(novoEstado);
  };

  // Mapear todas as seções únicas disponíveis no JSON para o filtro
  const secoesDisponiveis = useMemo(() => {
    const secoes = new Set(dadosAlbum.lista_figurinhas.map((f) => f.secao));
    return ['todas', ...Array.from(secoes)];
  }, []);

  // Estatísticas do Álbum
  const estatisticas = useMemo(() => {
    let preenchidas = 0;
    let repetidas = 0;
    const total = dadosAlbum.lista_figurinhas.length;

    dadosAlbum.lista_figurinhas.forEach((f) => {
      const qtd = album[f.id]?.obtidas || 0;
      if (qtd > 0) preenchidas++;
      if (qtd > 1) repetidas += qtd - 1;
    });

    const faltantes = total - preenchidas;

    return { total, preenchidas, faltantes, repetidas };
  }, [album]);

  // Filtragem e Busca das Figurinhas
  const figurinhasFiltradas = useMemo(() => {
    return dadosAlbum.lista_figurinhas.filter((f) => {
      const qtd = album[f.id]?.obtidas || 0;

      // Filtro de Busca (ID, Número ou País)
      const termo = busca.toLowerCase();
      const bateComBusca =
        f.id.toLowerCase().includes(termo) ||
        f.numero.toLowerCase().includes(termo) ||
        (f.pais && f.pais.toLowerCase().includes(termo));

      if (!bateComBusca) return false;

      // Filtro de Seção
      if (filtroSecao !== 'todas' && f.secao !== filtroSecao) return false;

      // Filtro de Status
      if (filtroStatus === 'preenchidas' && qtd === 0) return false;
      if (filtroStatus === 'faltantes' && qtd > 0) return false;
      if (filtroStatus === 'repetidas' && qtd <= 1) return false;

      return true;
    });
  }, [album, filtroStatus, filtroSecao, busca]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <header className="mb-8 border-b border-gray-800 pb-6 text-center lg:text-left lg:flex lg:justify-between lg:items-center">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500">
              {dadosAlbum.album}
            </h1>
            <p className="text-gray-400 mt-1">
              Gerenciador Pessoal de Figurinhas
            </p>
          </div>

          {/* Cards de Estatísticas */}
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

        {/* Barra de Filtros e Pesquisa */}
        <section className="bg-gray-800 p-4 rounded-2xl border border-gray-700 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pesquisa Direta */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
              Consultar ID ou País:
            </label>
            <input
              type="text"
              placeholder="Ex: BRA_10, Escudo, México..."
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          {/* Filtro por Status */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
              Filtrar por Status:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFiltroStatus('todas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filtroStatus === 'todas'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-900 hover:bg-gray-700 text-gray-300'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFiltroStatus('preenchidas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filtroStatus === 'preenchidas'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-900 hover:bg-gray-700 text-gray-300'
                }`}
              >
                Preenchidas
              </button>
              <button
                onClick={() => setFiltroStatus('faltantes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filtroStatus === 'faltantes'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-900 hover:bg-gray-700 text-gray-300'
                }`}
              >
                Faltantes
              </button>
              <button
                onClick={() => setFiltroStatus('repetidas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filtroStatus === 'repetidas'
                    ? 'bg-yellow-600 text-gray-900'
                    : 'bg-gray-900 hover:bg-gray-700 text-gray-300'
                }`}
              >
                Repetidas (Troca)
              </button>
            </div>
          </div>

          {/* Filtro por Seção / Grupo */}
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

        {/* Grid de Figurinhas */}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {figurinhasFiltradas.map((fig) => {
                const qtd = album[fig.id]?.obtidas || 0;

                // Definição de cores com base no status da figurinha
                let bordaCor = 'border-gray-700';
                let bgCard = 'bg-gray-800';
                if (qtd === 1) {
                  bordaCor = 'border-green-500';
                  bgCard = 'bg-green-950/30';
                }
                if (qtd > 1) {
                  bordaCor = 'border-yellow-500';
                  bgCard = 'bg-yellow-950/20';
                }

                return (
                  <div
                    key={fig.id}
                    className={`p-4 rounded-xl border ${bordaCor} ${bgCard} flex flex-col justify-between shadow-lg transition-transform hover:-translate-y-0.5`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-mono font-bold text-gray-400">
                          {fig.id}
                        </span>
                        {fig.tipo === 'Especial' ||
                        fig.tipo.includes('Brilhante') ? (
                          <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">
                            ★ Esp
                          </span>
                        ) : null}
                      </div>

                      <h3 className="font-bold text-lg text-white">
                        Nº {fig.numero}
                      </h3>
                      <p className="text-xs text-gray-400 truncate">
                        {fig.pais || fig.secao}
                      </p>
                    </div>

                    {/* Controles de Quantidade */}
                    <div className="mt-4 pt-3 border-t border-gray-700/60 flex items-center justify-between">
                      <button
                        onClick={() => removerFigurinha(fig.id)}
                        disabled={qtd === 0}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-lg transition-colors ${
                          qtd > 0
                            ? 'bg-gray-700 hover:bg-gray-600 text-white'
                            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        -
                      </button>

                      <span
                        className={`font-mono font-bold text-lg ${
                          qtd > 1
                            ? 'text-yellow-400'
                            : qtd === 1
                            ? 'text-green-400'
                            : 'text-gray-500'
                        }`}
                      >
                        {qtd}
                      </span>

                      <button
                        onClick={() => adicionarFigurinha(fig.id)}
                        className="w-7 h-7 bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center justify-center font-bold text-lg transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
