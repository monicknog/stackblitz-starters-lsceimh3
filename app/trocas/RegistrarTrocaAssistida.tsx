'use client';

import { useMemo, useState } from 'react';
import type { Figurinha } from '../components/FigurinhaCard';
import type { FigurinhaComTroca } from '../lib/album';

interface Props {
  disponiveis: FigurinhaComTroca[];
  faltando: Figurinha[];
}

type Iniciador = 'eu' | 'amigo';

function labelFigurinha(fig: { id: string; jogador?: string | null; pais?: string; secao?: string }) {
  return `${fig.id} - ${fig.jogador || fig.pais || fig.secao || 'Figurinha'}`;
}

export function RegistrarTrocaAssistida({ disponiveis, faltando }: Props) {
  const [aberto, setAberto] = useState(false);
  const [iniciador, setIniciador] = useState<Iniciador>('eu');
  const [buscaAlvo, setBuscaAlvo] = useState('');
  const [buscaOferta, setBuscaOferta] = useState('');
  const [alvos, setAlvos] = useState<string[]>([]);
  const [ofertas, setOfertas] = useState<string[]>([]);
  const [focoAlvo, setFocoAlvo] = useState(false);
  const [focoOferta, setFocoOferta] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const mapaFaltando = useMemo(() => new Map(faltando.map((f) => [f.id, f])), [faltando]);
  const mapaDisponiveis = useMemo(() => new Map(disponiveis.map((f) => [f.id, f])), [disponiveis]);

  const poolAlvo = iniciador === 'eu' ? faltando : disponiveis;
  const poolOferta = iniciador === 'eu' ? disponiveis : faltando;

  const tituloAlvo =
    iniciador === 'eu'
      ? 'Figurinhas que voce quer receber (minhas faltantes)'
      : 'Figurinhas que o amigo quer pegar (minhas repetidas)';

  const tituloOferta =
    iniciador === 'eu'
      ? 'Figurinhas que voce vai entregar (minhas repetidas)'
      : 'Figurinhas que o amigo vai entregar (minhas faltantes)';

  const adicionarAlvo = (id: string) => {
    if (!id || alvos.includes(id)) return;
    setAlvos((atual) => [...atual, id]);
  };

  const adicionarOferta = (id: string) => {
    if (!id || ofertas.includes(id)) return;
    setOfertas((atual) => [...atual, id]);
  };

  const removerAlvo = (id: string) => setAlvos((atual) => atual.filter((x) => x !== id));
  const removerOferta = (id: string) => setOfertas((atual) => atual.filter((x) => x !== id));

  const totalAlvos = alvos.length;
  const totalOfertas = ofertas.length;
  const saldo = totalOfertas - totalAlvos;

  const concluirTroca = async () => {
    if (alvos.length === 0 && ofertas.length === 0) {
      setMensagem('Selecione ao menos uma figurinha para concluir a troca.');
      return;
    }

    setConcluindo(true);
    setMensagem('');

    try {
      const recebidas = iniciador === 'eu' ? alvos : ofertas;
      const entregues = iniciador === 'eu' ? ofertas : alvos;

      const resSalvar = await fetch('/api/album/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recebidas, entregues }),
      });

      if (!resSalvar.ok) {
        throw new Error('Falha ao salvar troca no álbum.');
      }

      setMensagem('Troca concluída com sucesso. O álbum foi atualizado.');
      setAlvos([]);
      setOfertas([]);
      setBuscaAlvo('');
      setBuscaOferta('');
      window.setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (e) {
      setMensagem(e instanceof Error ? e.message : 'Não foi possível concluir a troca.');
    } finally {
      setConcluindo(false);
    }
  };

  const sugestoesAlvo = useMemo(() => {
    if (!focoAlvo) return [];
    const termo = buscaAlvo.toLowerCase().trim();
    const base = poolAlvo.filter((f) => !alvos.includes(f.id));
    const filtradas = !termo
      ? base
      : base.filter((f) => `${f.id} ${f.jogador || ''} ${f.pais || ''} ${f.secao || ''}`.toLowerCase().includes(termo));
    return filtradas
      .slice(0, 8);
  }, [poolAlvo, alvos, buscaAlvo, focoAlvo]);

  const sugestoesOferta = useMemo(() => {
    if (!focoOferta) return [];
    const termo = buscaOferta.toLowerCase().trim();
    const base = poolOferta.filter((f) => !ofertas.includes(f.id));
    const filtradas = !termo
      ? base
      : base.filter((f) => `${f.id} ${f.jogador || ''} ${f.pais || ''} ${f.secao || ''}`.toLowerCase().includes(termo));
    return filtradas
      .slice(0, 8);
  }, [poolOferta, ofertas, buscaOferta, focoOferta]);

  return (
    <section className="mb-6 rounded-2xl border border-gray-700 bg-gray-800/50 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-white">Registrar troca</h2>
          <p className="text-sm text-gray-400 mt-1">
            Assistente para montar troca com amigos, com tags e totalizador de proximidade.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm font-semibold text-gray-100"
        >
          {aberto ? 'Ocultar' : 'Expandir'}
        </button>
      </div>

      {aberto ? (
        <>
        <div className="min-w-48 mt-4">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Quem iniciou a troca</label>
          <select
            value={iniciador}
            onChange={(e) => {
              const proximo = e.target.value as Iniciador;
              setIniciador(proximo);
              setAlvos([]);
              setOfertas([]);
              setBuscaAlvo('');
              setBuscaOferta('');
            }}
            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="eu">Eu iniciei</option>
            <option value="amigo">Meu amigo iniciou</option>
          </select>
        </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-3">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">{tituloAlvo}</label>
          <div className="relative">
          <input
            value={buscaAlvo}
            onChange={(e) => setBuscaAlvo(e.target.value)}
            onFocus={() => setFocoAlvo(true)}
            onBlur={() => window.setTimeout(() => setFocoAlvo(false), 120)}
            placeholder="Digite codigo ou nome"
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 pr-9 text-white focus:border-emerald-500 focus:outline-none"
          />
            {buscaAlvo ? (
              <button
                type="button"
                onClick={() => setBuscaAlvo('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs"
                aria-label="Limpar busca de alvo"
              >
                X
              </button>
            ) : null}
          </div>
          {sugestoesAlvo.length > 0 ? (
            <div className="mt-2 rounded-lg border border-gray-700 bg-gray-950/70 p-1 space-y-1">
              {sugestoesAlvo.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => adicionarAlvo(f.id)}
                  className="w-full text-left px-2 py-1 rounded hover:bg-gray-800 text-xs text-gray-200"
                >
                  {labelFigurinha(f)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {alvos.map((id) => {
              const fig = mapaFaltando.get(id) || mapaDisponiveis.get(id);
              if (!fig) return null;
              return (
                <span key={id} className="inline-flex items-center gap-2 rounded-full bg-gray-800 border border-gray-700 px-3 py-1 text-xs text-gray-200">
                  {labelFigurinha(fig)}
                  <button type="button" onClick={() => removerAlvo(id)} className="text-gray-400 hover:text-white">x</button>
                </span>
              );
            })}
            {alvos.length === 0 ? <p className="text-xs text-gray-500">Nenhuma figurinha selecionada.</p> : null}
          </div>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-3">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">{tituloOferta}</label>
          <div className="relative">
          <input
            value={buscaOferta}
            onChange={(e) => setBuscaOferta(e.target.value)}
            onFocus={() => setFocoOferta(true)}
            onBlur={() => window.setTimeout(() => setFocoOferta(false), 120)}
            placeholder="Digite codigo ou nome"
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 pr-9 text-white focus:border-emerald-500 focus:outline-none"
          />
            {buscaOferta ? (
              <button
                type="button"
                onClick={() => setBuscaOferta('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs"
                aria-label="Limpar busca de oferta"
              >
                X
              </button>
            ) : null}
          </div>
          {sugestoesOferta.length > 0 ? (
            <div className="mt-2 rounded-lg border border-gray-700 bg-gray-950/70 p-1 space-y-1">
              {sugestoesOferta.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => adicionarOferta(f.id)}
                  className="w-full text-left px-2 py-1 rounded hover:bg-gray-800 text-xs text-gray-200"
                >
                  {labelFigurinha(f)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {ofertas.map((id) => {
              const fig = mapaFaltando.get(id) || mapaDisponiveis.get(id);
              if (!fig) return null;
              return (
                <span key={id} className="inline-flex items-center gap-2 rounded-full bg-gray-800 border border-gray-700 px-3 py-1 text-xs text-gray-200">
                  {labelFigurinha(fig)}
                  <button type="button" onClick={() => removerOferta(id)} className="text-gray-400 hover:text-white">x</button>
                </span>
              );
            })}
            {ofertas.length === 0 ? <p className="text-xs text-gray-500">Nenhuma figurinha selecionada.</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-700 bg-gray-900/60 p-3">
        <p className="text-xs uppercase text-gray-400 font-bold mb-2">Totalizador</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-gray-800 border border-gray-700 p-2">
            <p className="text-[11px] text-gray-400">Itens alvo</p>
            <p className="text-lg font-bold text-emerald-400">{totalAlvos}</p>
          </div>
          <div className="rounded-lg bg-gray-800 border border-gray-700 p-2">
            <p className="text-[11px] text-gray-400">Itens na oferta</p>
            <p className="text-lg font-bold text-indigo-400">{totalOfertas}</p>
          </div>
          <div className="rounded-lg bg-gray-800 border border-gray-700 p-2">
            <p className="text-[11px] text-gray-400">Saldo</p>
            <p className={`text-lg font-bold ${saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {saldo >= 0 ? `+${saldo}` : saldo}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {saldo >= 0
            ? 'Voce atingiu ou passou o total de itens-alvo para esta troca.'
            : `Faltam ${Math.abs(saldo)} item(ns) na oferta para igualar os itens-alvo.`}
        </p>

        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={concluirTroca}
            disabled={concluindo}
            className="rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white"
          >
            {concluindo ? 'Concluindo...' : 'Concluir troca'}
          </button>
          {mensagem ? <p className="text-xs text-gray-300">{mensagem}</p> : null}
        </div>
      </div>
      </>
      ) : null}
    </section>
  );
}
