'use client';

import { useMemo, useState } from 'react';

interface LinhaDisponivel {
  selecao: string;
  selecaoLabel: string;
  itens: Array<{ codigo: string; quantidade: number }>;
  ordemAlbum: number;
}

interface Props {
  linhas: LinhaDisponivel[];
}

export function DisponiveisResumoClient({ linhas }: Props) {
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
          .print-chip {
            border: 1px solid #111 !important;
            background: #fff !important;
            color: #000 !important;
          }
        }
      `}</style>

      <div className="max-w-6xl mx-auto">
        <header className="mb-6 sm:mb-8 rounded-2xl border border-gray-800 bg-gray-900/70 px-5 py-5 sm:px-6 sm:py-6 no-print">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Resumo de Disponíveis para Troca</h1>
          <p className="text-sm text-gray-400 mt-2">
            Lista por seleção com figurinhas que você tem para trocar.
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
                  <th className="w-44 bg-gray-900 text-left px-3 py-2 text-xs uppercase tracking-wide text-gray-300 border-b border-gray-700 print:bg-gray-100 print:text-black">
                    Categoria
                  </th>
                  <th className="bg-gray-900 text-left px-3 py-2 text-xs uppercase tracking-wide text-gray-300 border-b border-gray-700 print:bg-gray-100 print:text-black">
                    Figurinhas disponíveis
                  </th>
                  <th className="w-24 bg-gray-900 text-center px-3 py-2 text-xs uppercase tracking-wide text-gray-300 border-b border-gray-700 print:bg-gray-100 print:text-black">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {linhasOrdenadas.map((linha, idx) => (
                  <tr key={linha.selecao} className={idx % 2 === 0 ? 'bg-gray-900/50 print:bg-white' : 'bg-gray-800/50 print:bg-gray-50'}>
                    <td className="px-3 py-2 align-top border-b border-gray-800 print:border-gray-300">
                      <span className="font-bold text-white print:text-black">{linha.selecaoLabel}</span>
                    </td>
                    <td className="px-3 py-2 border-b border-gray-800 print:border-gray-300">
                      {linha.itens.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {linha.itens.map((it) => (
                            <span key={`${linha.selecao}-${it.codigo}`} className="inline-flex items-center rounded-md border border-gray-600 bg-gray-800 text-gray-100 px-2 py-0.5 text-xs font-medium print-chip">
                              {it.codigo} ({it.quantidade})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 print:text-gray-700">(sem disponíveis)</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center align-top border-b border-gray-800 print:border-gray-300">
                      <span className="font-semibold text-gray-200 print:text-black">{linha.itens.length}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
