'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { SENHA_PRINCIPAL, type InteresseTroca } from '../lib/album';

const CHAVE_AUTENTICACAO = 'album_copa_2026_autenticado';

export default function InteressadosPage() {
  const [autenticado, setAutenticado] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState('');
  const [mensagemSenha, setMensagemSenha] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [interesses, setInteresses] = useState<InteresseTroca[]>([]);
  const [mensagemErro, setMensagemErro] = useState('');
  const [busca, setBusca] = useState('');
  const [atualizandoId, setAtualizandoId] = useState('');

  useEffect(() => {
    const desbloqueado = localStorage.getItem(CHAVE_AUTENTICACAO);
    if (desbloqueado === 'true') {
      setAutenticado(true);
    }
  }, []);

  useEffect(() => {
    if (!autenticado) return;

    let ativo = true;

    const carregar = async () => {
      try {
        const response = await fetch('/api/interesses', { cache: 'no-store' });

        if (!response.ok) {
          throw new Error('Falha ao carregar interesses.');
        }

        const dados = (await response.json()) as { interesses?: InteresseTroca[] };

        if (ativo) {
          setInteresses(dados.interesses ?? []);
        }
      } catch {
        if (ativo) {
          setMensagemErro('Não foi possível carregar os interessados em troca.');
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    };

    void carregar();

    return () => {
      ativo = false;
    };
  }, [autenticado]);

  const confirmarSenha = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    if (senhaDigitada === SENHA_PRINCIPAL) {
      setAutenticado(true);
      setMensagemSenha('');
      localStorage.setItem(CHAVE_AUTENTICACAO, 'true');
      return;
    }

    setMensagemSenha('Senha incorreta.');
  };

  const interessesFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return interesses;

    return interesses.filter((item) => {
      return (
        item.nome.toLowerCase().includes(termo) ||
        item.figurinhaDesejadaNome.toLowerCase().includes(termo) ||
        item.figurinhaDesejadaId.toLowerCase().includes(termo)
      );
    });
  }, [busca, interesses]);

  const rejeitarInteresse = async (interesseId: string) => {
    setAtualizandoId(interesseId);

    try {
      const response = await fetch('/api/interesses', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interesseId, status: 'rejeitado' }),
      });

      if (!response.ok) {
        throw new Error('Falha ao rejeitar.');
      }

      setInteresses((estadoAtual) =>
        estadoAtual.map((item) =>
          item.id === interesseId
            ? { ...item, status: 'rejeitado', rejectedAt: new Date().toISOString() }
            : item,
        ),
      );
    } catch {
      setMensagemErro('Não foi possível rejeitar o interesse.');
    } finally {
      setAtualizandoId('');
    }
  };

  const aceitarInteresse = async (interesseId: string) => {
    setAtualizandoId(interesseId);

    try {
      const response = await fetch('/api/interesses', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interesseId, status: 'aceito' }),
      });

      if (!response.ok) {
        throw new Error('Falha ao aceitar.');
      }

      setInteresses((estadoAtual) =>
        estadoAtual.map((item) =>
          item.id === interesseId
            ? { ...item, status: 'aceito', acceptedAt: new Date().toISOString() }
            : item,
        ),
      );
    } catch {
      setMensagemErro('Não foi possível aceitar o interesse.');
    } finally {
      setAtualizandoId('');
    }
  };

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-6">
        <form
          onSubmit={confirmarSenha}
          className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl"
        >
          <h1 className="text-2xl font-bold text-white mb-2">
            Interessados em troca
          </h1>
          <p className="text-gray-400 mb-6">
            Informe a mesma senha do álbum para ver os interessados.
          </p>

          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
            Senha
          </label>
          <input
            type="password"
            value={senhaDigitada}
            onChange={(e) => setSenhaDigitada(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
            placeholder="Digite a senha"
            autoFocus
          />

          {mensagemSenha && (
            <p className="text-red-400 text-sm mt-3">{mensagemSenha}</p>
          )}

          <button
            type="submit"
            className="mt-5 w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-gray-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 sm:mb-8 rounded-3xl border border-gray-800 bg-gray-900/70 backdrop-blur px-5 py-6 sm:px-6 sm:py-7 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500">
                Interessados em troca
              </h1>
              <p className="text-gray-400 mt-2 max-w-2xl">
                Lista de pessoas que registraram interesse em trocar figurinhas com você.
              </p>
            </div>

            <div className="bg-gray-800/80 p-3 rounded-2xl border border-gray-700 text-center min-w-40">
              <span className="text-xs text-gray-400 block uppercase font-bold">
                Registros
              </span>
              <span className="text-xl font-bold text-blue-400">{interesses.length}</span>
            </div>
          </div>
        </header>

        <section className="mb-4 grid grid-cols-1 gap-3">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou figurinha"
            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
          />
        </section>

        {mensagemErro ? (
          <div className="mb-4 rounded-2xl border border-dashed border-gray-700 bg-gray-800 py-10 text-center text-gray-400">
            {mensagemErro}
          </div>
        ) : carregando ? (
          <div className="mb-4 rounded-2xl border border-dashed border-gray-700 bg-gray-800 py-10 text-center text-gray-400">
            Carregando interessados...
          </div>
        ) : interessesFiltrados.length === 0 ? (
          <div className="mb-4 rounded-2xl border border-dashed border-gray-700 bg-gray-800 py-10 text-center text-gray-400">
            Nenhum interessado encontrado.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {interessesFiltrados.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-gray-700 bg-gray-800/80 p-4 shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">{item.nome}</h2>
                    <p className="text-sm text-gray-400 mt-1">{item.figurinhaDesejadaNome}</p>
                  </div>
                  <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-[10px] font-bold uppercase text-red-300">
                    {item.status}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-gray-400">
                  <p>Quer receber: {item.figurinhaDesejadaNome}</p>
                  <p>Pode me dar: {item.figurinhaOfertadaNome}</p>
                  <p className="text-gray-500">Código desejado: {item.figurinhaDesejadaId}</p>
                  <p className="text-gray-500">Código ofertado: {item.figurinhaOfertadaId}</p>
                </div>

                {item.status === 'pendente' && (
                  <div className="mt-4 flex justify-end">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => aceitarInteresse(item.id)}
                        disabled={atualizandoId === item.id}
                        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-gray-900 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {atualizandoId === item.id ? 'Atualizando...' : 'Aceitar'}
                      </button>

                      <button
                        type="button"
                        onClick={() => rejeitarInteresse(item.id)}
                        disabled={atualizandoId === item.id}
                        className="rounded-lg border border-gray-600 bg-gray-900 px-3 py-1.5 text-xs font-bold text-gray-200 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {atualizandoId === item.id ? 'Atualizando...' : 'Rejeitar'}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}