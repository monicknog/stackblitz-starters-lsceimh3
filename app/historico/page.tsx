import { listaFigurinhas } from '../lib/album';
import { listarHistoricoAlteracoes } from '../lib/album-db';

export default async function HistoricoPage() {
  const items = await listarHistoricoAlteracoes(20);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Histórico completo de alterações</h1>
          <p className="text-sm text-gray-400 mt-2">Últimas alterações no álbum (adições e remoções).</p>
        </header>

        <main className="bg-gray-800 p-4 rounded-2xl border border-gray-700">
          {items.length === 0 ? (
            <p className="text-gray-400">Nenhuma alteração registrada.</p>
          ) : (
            <div className="relative space-y-4 pl-5 before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-gray-700">
              {items.map((it) => {
                const meta = listaFigurinhas.find((f) => f.id === it.figurinhaId);
                const label = meta
                  ? `${meta.numero} ${meta.jogador ?? meta.pais ?? ''} (${meta.id})`
                  : `(${it.figurinhaId})`;
                const sign = it.delta >= 0 ? `+${it.delta}` : `${it.delta}`;

                return (
                  <div key={it.id} className="relative rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm text-gray-200">
                    <div className="absolute -left-7 top-4 h-3 w-3 rounded-full bg-emerald-400 ring-4 ring-gray-800" />
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="font-semibold">{label}</div>
                      <div className={`px-2 py-0.5 rounded text-xs ${it.delta > 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                        {sign}
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 flex items-center justify-between gap-4">
                      <span>{it.source || 'manual'}</span>
                      <span>{new Date(it.createdAt).toLocaleString()}</span>
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
