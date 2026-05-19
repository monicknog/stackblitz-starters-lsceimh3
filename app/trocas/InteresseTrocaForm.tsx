'use client';

import { useMemo, useState, useEffect, type FormEvent } from 'react';
import type { Figurinha } from '../components/FigurinhaCard';

interface InteresseTrocaFormProps {
  disponiveis: Figurinha[];
  faltando: Figurinha[];
}

export function InteresseTrocaForm({ disponiveis, faltando }: InteresseTrocaFormProps) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [figurinhaDesejadaId, setFigurinhaDesejadaId] = useState(disponiveis[0]?.id ?? '');
  const [figurinhaOfertadaId, setFigurinhaOfertadaId] = useState(faltando[0]?.id ?? '');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [reservasPorId, setReservasPorId] = useState<Record<string, number>>({});
  const [ofertasPorId, setOfertasPorId] = useState<Record<string, number>>({});

  const opcoesDesejadas = useMemo(() => {
    return disponiveis
      .map((fig) => {
        const disponiveisParaTroca = (fig as any).disponiveisParaTroca ?? Math.max(0, (fig as any).obtidas ?? 0 - 1);
        const reservado = reservasPorId[fig.id] || 0;
        const disponivelReal = Math.max(0, disponiveisParaTroca - reservado);
        return { fig, disponivelReal };
      })
      .filter(({ disponivelReal }) => disponivelReal > 0)
      .map(({ fig }) => ({ id: fig.id, label: `${fig.id} - ${fig.jogador || fig.secao}` }));
  }, [disponiveis, reservasPorId]);

  const opcoesOfertadas = useMemo(() => {
    return faltando
      .filter((fig) => (ofertasPorId[fig.id] || 0) === 0)
      .map((fig) => ({ id: fig.id, label: `${fig.id} - ${fig.jogador || fig.secao}` }));
  }, [faltando, ofertasPorId]);

  // Keep selected ids in sync when available options change
  useEffect(() => {
    if (opcoesDesejadas.length > 0 && !opcoesDesejadas.find((o) => o.id === figurinhaDesejadaId)) {
      setFigurinhaDesejadaId(opcoesDesejadas[0].id);
    }

    if (opcoesOfertadas.length > 0 && !opcoesOfertadas.find((o) => o.id === figurinhaOfertadaId)) {
      setFigurinhaOfertadaId(opcoesOfertadas[0].id);
    }
  }, [opcoesDesejadas, opcoesOfertadas]);

  // Load current pending reservations when form opens
  useEffect(() => {
    let ativo = true;

    if (!aberto) return;

    void (async () => {
      try {
        const resp = await fetch('/api/interesses', { cache: 'no-store' });
        if (!resp.ok) return;
        const dados = (await resp.json()) as { interesses?: Array<{ figurinhaDesejadaId: string; status: string }> };

        if (!ativo) return;

        const pendentes = (dados.interesses ?? []).filter((i) => i.status === 'pendente');
        const contagemDesejadas = pendentes.reduce<Record<string, number>>((acc, it) => {
          const id = (it as any).figurinhaDesejadaId || (it as any).figurinha_desejada_id;
          if (!id) return acc;
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        }, {});

        const contagemOfertas = pendentes.reduce<Record<string, number>>((acc, it) => {
          const id = (it as any).figurinhaOfertadaId || (it as any).figurinha_ofertada_id;
          if (!id) return acc;
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        }, {});

        setReservasPorId(contagemDesejadas);
        setOfertasPorId(contagemOfertas);
      } catch {
        // ignore
      }
    })();

    return () => {
      ativo = false;
    };
  }, [aberto]);

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setMensagem('');

    if (!nome.trim() || !figurinhaDesejadaId || !figurinhaOfertadaId) {
      setMensagem('Informe seu nome e selecione as duas figurinhas.');
      return;
    }

    setEnviando(true);

    try {
      const response = await fetch('/api/interesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome,
          figurinhaDesejadaId,
          figurinhaOfertadaId,
        }),
      });

      const dados = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMensagem(dados.error || 'Falha ao salvar.');

        // If it's a reservation conflict, refresh page to update availability
        if (response.status === 409) {
          window.location.reload();
          return;
        }

        throw new Error(dados.error || 'Falha ao salvar.');
      }

      // Successful — refresh to update available list
      setMensagem('Interesse registrado com sucesso.');
      window.location.reload();
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : 'Não foi possível enviar.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-gray-700 bg-gray-800/50 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-white">
            Registrar interesse de troca
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            A pessoa informa o nome e escolhe uma figurinha que está faltando para você.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAberto((estado) => !estado)}
          className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-gray-950 transition-colors hover:bg-emerald-400"
        >
          {aberto ? 'Fechar' : 'Quero trocar'}
        </button>
      </div>

      {mensagem && (
        <p className="mt-3 text-sm text-cyan-300">{mensagem}</p>
      )}

      {aberto && (
        <form onSubmit={enviar} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
              Seu nome
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              placeholder="Ex: João"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
              Figurinha que você quer receber
            </label>
            <select
              value={figurinhaDesejadaId}
              onChange={(e) => setFigurinhaDesejadaId(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              disabled={opcoesDesejadas.length === 0}
            >
              {opcoesDesejadas.length === 0 ? (
                <option value="">Nenhuma figurinha disponível</option>
              ) : (
                opcoesDesejadas.map((opcao) => (
                  <option key={opcao.id} value={opcao.id}>
                    {opcao.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
              Figurinha que você pode me dar
            </label>
            <select
              value={figurinhaOfertadaId}
              onChange={(e) => setFigurinhaOfertadaId(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              disabled={opcoesOfertadas.length === 0}
            >
              {opcoesOfertadas.length === 0 ? (
                <option value="">Nenhuma figurinha faltando</option>
              ) : (
                opcoesOfertadas.map((opcao) => (
                  <option key={opcao.id} value={opcao.id}>
                    {opcao.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="sm:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={enviando || opcoesDesejadas.length === 0 || opcoesOfertadas.length === 0}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-gray-700"
            >
              {enviando ? 'Enviando...' : 'Salvar interesse'}
            </button>

            <span className="text-xs text-gray-500">
              Os dados vão para uma tabela separada de interesses, sem alterar seu álbum.
            </span>
          </div>
        </form>
      )}
    </section>
  );
}