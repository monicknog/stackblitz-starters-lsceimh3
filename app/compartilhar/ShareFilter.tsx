"use client";

import { useMemo, useState } from 'react';
import { FigurinhaCard } from '../components/FigurinhaCard';
import type { EstadoFigurinhas } from '../lib/album';

interface ShareFilterProps {
  lista: any[];
  album: EstadoFigurinhas;
}

export function ShareFilter({ lista, album }: ShareFilterProps) {
  const [busca, setBusca] = useState<string>('');
  const [filtroSecao, setFiltroSecao] = useState<string>('todas');
  const [filtroTime, setFiltroTime] = useState<string>('todas');
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'tenho' | 'faltando'>('todas');

  const itens = lista.map((l) => ({ ...l }));

  const secoesDisponiveis = useMemo(() => {
    const s = new Set(itens.map((f) => f.secao));
    return ['todas', ...Array.from(s).sort()];
  }, [itens]);

  const timesDisponiveis = useMemo(() => {
    const times = new Map<string, string>();
    itens.forEach((f) => {
      if (f.sigla) times.set(f.sigla, f.pais ?? f.sigla);
    });
    return ['todas', ...Array.from(times.keys()).sort()];
  }, [itens]);

  const filtradas = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return itens.filter((fig) => {
      const qtd = album[fig.id]?.obtidas || 0;

      if (filtroStatus === 'tenho' && qtd <= 0) return false;
      if (filtroStatus === 'faltando' && qtd > 0) return false;

      if (termo) {
        const bate =
          fig.id.toLowerCase().includes(termo) ||
          (fig.numero && fig.numero.toLowerCase().includes(termo)) ||
          (fig.pais && fig.pais.toLowerCase().includes(termo)) ||
          (fig.jogador && fig.jogador.toLowerCase().includes(termo)) ||
          (fig.secao && fig.secao.toLowerCase().includes(termo));
        if (!bate) return false;
      }

      if (filtroSecao !== 'todas' && fig.secao !== filtroSecao) return false;
      if (filtroTime !== 'todas' && fig.sigla !== filtroTime) return false;

      return true;
    });
  }, [itens, album, busca, filtroSecao, filtroTime, filtroStatus]);

  return (
    <>
      <section className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          type="text"
          placeholder="Buscar: nome, código, país"
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <select
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
          value={filtroSecao}
          onChange={(e) => setFiltroSecao(e.target.value)}
        >
          {secoesDisponiveis.map((s) => (
            <option key={s} value={s}>
              {s === 'todas' ? 'Todas as seções' : s}
            </option>
          ))}
        </select>

        <select
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
          value={filtroTime}
          onChange={(e) => setFiltroTime(e.target.value)}
        >
          {timesDisponiveis.map((t) => (
            <option key={t} value={t}>
              {t === 'todas' ? 'Todas as seleções' : `${t} — ${itens.find(f=>f.sigla===t)?.pais ?? t}`}
            </option>
          ))}
        </select>

        <select
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as 'todas' | 'tenho' | 'faltando')}
        >
          <option value="todas">Todas</option>
          <option value="tenho">Tenho</option>
          <option value="faltando">Faltando</option>
        </select>
      </section>

      {filtradas.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-2xl border border-dashed border-gray-700 text-gray-400">
          Nenhuma figurinha corresponde aos filtros aplicados.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {filtradas.map((fig) => (
            <FigurinhaCard key={fig.id} fig={fig} qtd={album[fig.id]?.obtidas || 0} readOnly />
          ))}
        </div>
      )}
    </>
  );
}
