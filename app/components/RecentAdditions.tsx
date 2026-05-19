'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      try {
        const res = await fetch('/api/album/history', { cache: 'no-store' });
        if (!res.ok) return;
        const dados = await res.json();
        if (!ativo) return;
        setItems(dados.items ?? []);
      } catch {
        // ignore
      }
    };

    void carregar();
    const iv = setInterval(carregar, 8000);
    return () => {
      ativo = false;
      clearInterval(iv);
    };
  }, []);

  return (
    <div className="mt-6 bg-gray-800 p-4 rounded-2xl border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm text-gray-300 font-semibold">Últimas figurinhas adicionadas</h3>
        <a href="/historico" className="text-xs text-blue-400 hover:underline">Ver histórico completo</a>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma alteração recente registrada.</p>
      ) : (
        <ul className="text-sm text-gray-200 space-y-2">
          {items.map((it) => {
            const meta = listaFigurinhas.find((f) => f.id === it.figurinhaId);
            const label = meta ? `${meta.numero} ${meta.jogador ?? meta.pais ?? ''}` : it.figurinhaId;
            const sign = it.delta >= 0 ? `+${it.delta}` : `${it.delta}`;

            return (
              <li key={it.id} className="flex justify-between">
                <span>{label}</span>
                <span className="text-gray-400">{sign} • {new Date(it.createdAt).toLocaleString()}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
