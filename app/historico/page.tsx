import { listaFigurinhas } from '../lib/album';
import { listarHistoricoAlteracoes } from '../lib/album-db';

export default async function HistoricoPage() {
  const items = await listarHistoricoAlteracoes(200);

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
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-400">
                  <th className="py-2">Figurinha</th>
                  <th className="py-2">Delta</th>
                  <th className="py-2">Fonte</th>
                  <th className="py-2">Data</th>
                </tr>
              </thead>
              <tbody className="text-gray-200">
                {items.map((it) => {
                  const meta = listaFigurinhas.find((f) => f.id === it.figurinhaId);
                  const label = meta ? `${meta.numero} ${meta.jogador ?? meta.pais ?? ''}` : it.figurinhaId;
                  const sign = it.delta >= 0 ? `+${it.delta}` : `${it.delta}`;

                  return (
                    <tr key={it.id} className="border-t border-gray-700">
                      <td className="py-2">{label}</td>
                      <td className="py-2">{sign}</td>
                      <td className="py-2">{it.source}</td>
                      <td className="py-2">{new Date(it.createdAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </main>
      </div>
    </div>
  );
}
