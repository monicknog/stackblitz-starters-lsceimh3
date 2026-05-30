'use client';

import { useMemo, useState } from 'react';

interface LinhaFaltante {
  selecao: string;
  selecaoLabel: string;
  codigos: string[];
  ordemAlbum: number;
}

interface Props {
  linhas: LinhaFaltante[];
}

export function FaltantesResumoClient({ linhas }: Props) {
  const [modoOrdenacao, setModoOrdenacao] = useState<'alfabetica' | 'album'>('alfabetica');

  const linhasOrdenadas = useMemo(() => {
    const copia = [...linhas];
    if (modoOrdenacao === 'album') {
      copia.sort((a, b) => a.ordemAlbum - b.ordemAlbum || a.selecao.localeCompare(b.selecao, 'pt-BR'));
      return copia;
    }
    copia.sort((a, b) => a.selecao.localeCompare(b.selecao, 'pt-BR'));
    return copia;
  }, [linhas, modoOrdenacao]);

  const exportarPdf = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 print:bg-white print:text-black">
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          .print-table th,
          .print-table td {
            border: 1px solid #111 !important;
          }
          .print-row-alt {
            background: #f3f4f6 !important;
          }
          .print-chip {
            border: 1px solid #111 !important;
            background: #fff !important;
            color: #000 !important;
          }
        }
      `}</style>

      <div className="max-w-6xl mx-auto">
        <header className="mb-6 sm:mb-8 rounded-2xl border border-gray-800 bg-gray-900/70 px-5 py-5 sm:px-6 sm:py-6 no-print">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Resumo de Faltantes</h1>
          <p className="text-sm text-gray-400 mt-2">
            Lista por seleção com os códigos de figurinhas que ainda faltam.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              value={modoOrdenacao}
              onChange={(e) => setModoOrdenacao(e.target.value as 'alfabetica' | 'album')}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100"
            >
              <option value="alfabetica">Ordem alfabética</option>
              <option value="album">Ordem do álbum</option>
            </select>
            <button
              type="button"
              onClick={exportarPdf}
              className="rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Exportar PDF
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-gray-700 bg-gray-800/50 p-3 sm:p-4 print:border-gray-300 print:bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-sm print-table">
              <thead>
                <tr>
                  <th className="sticky top-0 z-10 w-40 bg-gray-900 text-left px-3 py-2 text-xs uppercase tracking-wide text-gray-300 border-b border-gray-700 print:bg-gray-100 print:text-black">
                    Categoria
                  </th>
                  <th className="sticky top-0 z-10 bg-gray-900 text-left px-3 py-2 text-xs uppercase tracking-wide text-gray-300 border-b border-gray-700 print:bg-gray-100 print:text-black">
                    Figurinhas faltantes
                  </th>
                  <th className="sticky top-0 z-10 w-24 bg-gray-900 text-center px-3 py-2 text-xs uppercase tracking-wide text-gray-300 border-b border-gray-700 print:bg-gray-100 print:text-black">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {linhasOrdenadas.map((linha, idx) => {
                  const especial = linha.selecao === 'FWC' || linha.selecao === 'COCA-COLA';
                  const baseRow =
                    idx % 2 === 0
                      ? 'bg-gray-900/50 print:bg-white'
                      : 'bg-gray-800/50 print:bg-gray-50';
                  const especialRow = especial
                    ? 'ring-1 ring-amber-500/40 bg-amber-950/20 print:bg-white'
                    : '';

                  return (
                    <tr key={linha.selecao} className={`${baseRow} ${especialRow} ${idx % 2 === 1 ? 'print-row-alt' : ''}`}>
                      <td className="px-3 py-2 align-top border-b border-gray-800 print:border-gray-300">
                        <span className={`font-bold ${especial ? 'text-amber-300 print:text-black' : 'text-white print:text-black'}`}>
                          {linha.selecaoLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 border-b border-gray-800 print:border-gray-300">
                        {linha.codigos.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {linha.codigos.map((codigo) => (
                              <span
                                key={`${linha.selecao}-${codigo}`}
                                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                                  especial
                                    ? 'border-amber-700 bg-amber-900/30 text-amber-200 print:border-gray-400 print:bg-white print:text-black'
                                    : 'border-gray-600 bg-gray-800 text-gray-100 print:border-gray-400 print:bg-white print:text-black'
                                } print-chip`}
                              >
                                {codigo}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 print:text-gray-700">(sem faltantes)</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center align-top border-b border-gray-800 print:border-gray-300">
                        <span className={`font-semibold ${especial ? 'text-amber-300 print:text-black' : 'text-gray-200 print:text-black'}`}>
                          {linha.codigos.length}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
