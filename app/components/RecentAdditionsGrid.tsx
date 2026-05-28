'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { listaFigurinhas } from '../lib/album';

type ChangeItem = {
  id: string;
  figurinhaId: string;
  delta: number;
  source: string;
  createdAt: string;
};

export function RecentAdditionsGrid() {
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
    <section className="bg-gray-800 p-4 rounded-2xl border border-gray-700 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm text-gray-300 font-semibold">Ultimas figurinhas adicionadas</h3>
        <div className="flex items-center gap-3">
          <Link href="/historico" className="text-xs text-blue-400 hover:underline">
            Ver historico completo
          </Link>
          <button
            type="button"
            onClick={async () => {
              if (generating) return;
              setGenerating(true);
              try {
                const res = await fetch('/api/album/history/regenerate', { method: 'POST' });
                if (res.ok) {
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
            {generating ? 'Gerando...' : 'Gerar historico'}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma alteracao recente registrada.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => {
            const meta = listaFigurinhas.find((f) => f.id === it.figurinhaId);
            const label = meta
              ? `${meta.numero} ${meta.jogador ?? meta.pais ?? ''} (${meta.id})`
              : `(${it.figurinhaId})`;
            const sign = it.delta >= 0 ? `+${it.delta}` : `${it.delta}`;
            const origem = it.source === 'trade_accept' ? 'Troca aceita' : 'Manual';

            return (
              <div key={it.id} className="rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm text-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">{label}</div>
                  <div className={`px-2 py-0.5 rounded text-xs ${it.delta > 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {sign}
                  </div>
                </div>

                <div className="text-xs text-gray-400 flex items-center justify-between">
                  <span
                    className={`rounded px-2 py-0.5 font-semibold ${
                      it.source === 'trade_accept'
                        ? 'bg-violet-600/30 text-violet-300'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {origem}
                  </span>
                  <span>{new Date(it.createdAt).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
