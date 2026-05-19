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

  if (items.length === 0) return null;

  return (
    <div className="mt-6 bg-gray-800 p-4 rounded-2xl border border-gray-700">
      <h3 className="text-sm text-gray-300 font-semibold mb-2">Últimas figurinhas adicionadas</h3>
      <ul className="text-sm text-gray-200 space-y-2">
        {items.map((it) => {
          const meta = listaFigurinhas.find((f) => f.id === it.figurinhaId);
          return (
            <li key={it.id} className="flex justify-between">
              <span>
                {meta ? `${meta.numero} ${meta.jogador ?? meta.pais ?? ''}` : it.figurinhaId}
              </span>
              <span className="text-gray-400">+{it.delta} • {new Date(it.createdAt).toLocaleString()}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
