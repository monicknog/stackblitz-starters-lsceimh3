'use client';

import { useMemo, useState } from 'react';
import { FigurinhaCard } from '../components/FigurinhaCard';
import type { FigurinhaComTroca } from '../lib/album';

interface TrocasFilterProps {
  disponiveis: FigurinhaComTroca[];
  totalDisponiveis: number;
  listaFigurinhasLength: number;
}

export function TrocasFilter({
  disponiveis,
  totalDisponiveis,
  listaFigurinhasLength,
}: TrocasFilterProps) {
  const [busca, setBusca] = useState<string>('');
  const [filtroSecao, setFiltroSecao] = useState<string>('todas');
  const [filtroTime, setFiltroTime] = useState<string>('todas');

  const secoesDisponiveis = useMemo(() => {
    const secoes = new Set(disponiveis.map((f) => f.secao));
    return ['todas', ...Array.from(secoes).sort()];
  }, [disponiveis]);

  const timesDisponiveis = useMemo(() => {
    const times = new Map<string, string>();
    disponiveis.forEach((f) => {
      if (f.sigla) times.set(f.sigla, f.pais ?? f.sigla);
    });
    return ['todas', ...Array.from(times.keys()).sort()];
  }, [disponiveis]);

  const figurinhasFiltradas = useMemo(() => {
    return disponiveis.filter((fig) => {
      const termo = busca.toLowerCase().trim();

      if (termo) {
        const bateComBusca =
          fig.id.toLowerCase().includes(termo) ||
          fig.numero.toLowerCase().includes(termo) ||
          (fig.pais && fig.pais.toLowerCase().includes(termo)) ||
          (fig.jogador && fig.jogador.toLowerCase().includes(termo)) ||
          (fig.secao && fig.secao.toLowerCase().includes(termo));

        if (!bateComBusca) return false;
      }

      if (filtroSecao !== 'todas' && fig.secao !== filtroSecao) return false;
      if (filtroTime !== 'todas' && fig.sigla !== filtroTime) return false;

      return true;
    });
  }, [disponiveis, busca, filtroSecao, filtroTime]);

  const totalFiltrado = figurinhasFiltradas.reduce(
    (acumulado, figurinha) => acumulado + figurinha.disponiveisParaTroca,
    0,
  );

  return (
    <>
      <section className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
            Buscar por nome, código ou país:
          </label>
          <input
            type="text"
            placeholder="Ex: Brasil, BRA_1, Neymar..."
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
            Filtrar por seção:
          </label>
          <select
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 capitalize"
            value={filtroSecao}
            onChange={(e) => setFiltroSecao(e.target.value)}
          >
            {secoesDisponiveis.map((sec) => (
              <option key={sec} value={sec}>
                {sec === 'todas' ? 'Todas as seções' : sec}
              </option>
            ))}
          </select>

          <label className="block text-xs font-bold text-gray-400 uppercase mb-2 mt-3">
            Filtrar por seleção/time:
          </label>
          <select
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            value={filtroTime}
            onChange={(e) => setFiltroTime(e.target.value)}
          >
            {timesDisponiveis.map((sig) => (
              <option key={sig} value={sig} className="capitalize">
                {sig === 'todas' ? 'Todas as seleções' : `${sig} — ${disponiveis.find(f => f.sigla===sig)?.pais ?? sig}`}
              </option>
            ))}
          </select>
        </div>
      </section>

      <main>
        <div className="mb-4 text-center sm:text-left">
          <h2 className="text-lg font-semibold text-gray-200">
            Figurinhas para trocar ({figurinhasFiltradas.length})
          </h2>
          {busca || filtroSecao !== 'todas' ? (
            <p className="text-sm text-gray-500 mt-1">
              {totalFiltrado} unidade{totalFiltrado !== 1 ? 's' : ''} disponível
              {totalFiltrado !== 1 ? 's' : ''}
            </p>
          ) : null}
        </div>

        {figurinhasFiltradas.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-2xl border border-dashed border-gray-700">
            <p className="text-gray-400">
              {disponiveis.length === 0
                ? 'Ainda não há figurinhas disponíveis para troca neste link.'
                : 'Nenhuma figurinha corresponde aos filtros aplicados.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {figurinhasFiltradas.map((fig) => (
              <FigurinhaCard
                key={fig.id}
                fig={fig}
                qtd={fig.disponiveisParaTroca}
                readOnly
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
