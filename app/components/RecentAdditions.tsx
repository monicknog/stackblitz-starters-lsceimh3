'use client';

import { useEffect, useState, useRef } from 'react';
import { listaFigurinhas } from '../lib/album';

type ChangeItem = {
  id: string;
  figurinhaId: string;
  delta: number;
  source: string;
  createdAt: string;
};

export function RecentAdditions() {
  const [items, setItems] = useState<ChangeItem[]>([]);
  const [generating, setGenerating] = useState(false);

  const mountedRef = useRef(true);

  const carregar = async () => {
    try {
      const res = await fetch('/api/album/history', { cache: 'no-store' });
      if (!res.ok) return;
      const dados = await res.json();
      if (!mountedRef.current) return;
      setItems(dados.items ?? []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    void carregar();
    const iv = setInterval(carregar, 8000);
    return () => {
      mountedRef.current = false;
      clearInterval(iv);
    };
  }, []);

  return (
    <div className="mt-6 bg-gray-800 p-4 rounded-2xl border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm text-gray-300 font-semibold">Últimas figurinhas adicionadas</h3>
        <div className="flex items-center gap-3">
          <a href="/historico" className="text-xs text-blue-400 hover:underline">Ver histórico completo</a>
          <button
            type="button"
            onClick={async () => {
              if (generating) return;
              setGenerating(true);
              try {
                const res = await fetch('/api/album/history/regenerate', { method: 'POST' });
                if (res.ok) {
                  // reload list
                  await carregar();
                }
              } catch {
                // ignore
              } finally {
                setGenerating(false);
              }
            }}
            className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-200 hover:bg-gray-600"
          >
            {generating ? 'Gerando...' : 'Gerar histórico'}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma alteração recente registrada.</p>
      ) : (
        <ul className="relative pl-5 space-y-3 text-sm text-gray-200 before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-gray-700">
          {items.map((it) => {
            const meta = listaFigurinhas.find((f) => f.id === it.figurinhaId);
            const label = meta
              ? `${meta.numero} ${meta.jogador ?? meta.pais ?? ''} (${meta.id})`
              : `(${it.figurinhaId})`;
            const sign = it.delta >= 0 ? `+${it.delta}` : `${it.delta}`;

            return (
              <li key={it.id} className="relative rounded-lg border border-gray-700 bg-gray-900/70 p-3">
                <span className="absolute -left-7 top-4 h-3 w-3 rounded-full bg-emerald-400 ring-4 ring-gray-800" />
                <div className="flex items-center justify-between gap-3">
                  <span>{label}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${it.delta > 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {sign}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-400 flex items-center justify-between gap-4">
                  <span>{it.source || 'manual'}</span>
                  <span>{new Date(it.createdAt).toLocaleString()}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
