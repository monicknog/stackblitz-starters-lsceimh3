'use client';

import { useEffect, useState } from 'react';
import { listaFigurinhas } from '../lib/album';

export function ShareLiveStats() {
  const [album, setAlbum] = useState<Record<string, any>>({});
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      try {
        const res = await fetch('/api/album', { cache: 'no-store' });
        if (!res.ok) return;
        const dados = await res.json();
        if (!ativo) return;
        setAlbum(dados.album || {});
        setUpdatedAt(dados.updatedAt ?? null);
      } catch {
        // ignore
      }
    };

    void carregar();

    const id = setInterval(() => void carregar(), 8000);
    return () => {
      ativo = false;
      clearInterval(id);
    };
  }, []);

  const estatisticas = listaFigurinhas.reduce(
    (acc, f) => {
      const qtd = Number(album[f.id]?.obtidas ?? album[f.id] ?? 0) || 0;
      if (qtd > 0) acc.preenchidas += 1;
      if (qtd > 1) acc.repetidas += qtd - 1;
      return acc;
    },
    { total: listaFigurinhas.length, preenchidas: 0, repetidas: 0 },
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 max-w-2xl mx-auto">
      <div className="bg-gray-800/80 p-3 rounded-2xl border border-gray-700 text-center">
        <span className="text-xs text-gray-400 block uppercase font-bold">Total</span>
        <span className="text-xl font-bold text-blue-400">{estatisticas.total}</span>
      </div>
      <div className="bg-gray-800/80 p-3 rounded-2xl border border-gray-700 text-center">
        <span className="text-xs text-gray-400 block uppercase font-bold">Tenho</span>
        <span className="text-xl font-bold text-green-400">{estatisticas.preenchidas}</span>
      </div>
      <div className="bg-gray-800/80 p-3 rounded-2xl border border-gray-700 text-center">
        <span className="text-xs text-gray-400 block uppercase font-bold">Faltam</span>
        <span className="text-xl font-bold text-red-400">{estatisticas.total - estatisticas.preenchidas}</span>
      </div>
      {updatedAt ? (
        <div className="col-span-full text-center text-xs text-gray-400 mt-2">Última atualização: {new Date(updatedAt).toLocaleString()}</div>
      ) : null}
    </div>
  );
}
