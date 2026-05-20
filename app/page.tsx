'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { FigurinhaCard } from './components/FigurinhaCard';
import {
  SENHA_PRINCIPAL,
  type EstadoFigurinhas,
  listaFigurinhas,
  obterAlbumTitulo,
} from './lib/album';
import { RecentAdditions } from './components/RecentAdditions';
import { RecentAdditionsGrid } from './components/RecentAdditionsGrid';

export default function Home() {
  const [album, setAlbum] = useState<EstadoFigurinhas>({});
  const [carregandoAlbum, setCarregandoAlbum] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<
    'todas' | 'preenchidas' | 'faltantes' | 'repetidas'
  >('todas');
  const [filtroSecao, setFiltroSecao] = useState<string>('todas');
  const [busca, setBusca] = useState<string>('');
  const [autenticado, setAutenticado] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState('');
  const [mensagemSenha, setMensagemSenha] = useState('');
  const [mensagemLink, setMensagemLink] = useState('');
  const [mensagemBanco, setMensagemBanco] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [showRecent, setShowRecent] = useState(false);

  useEffect(() => {
    let ativo = true;

    const carregarAlbum = async () => {
      try {
        const response = await fetch('/api/album', { cache: 'no-store' });

        if (!response.ok) {
          throw new Error('Falha ao carregar o álbum.');
        }

        const dados = (await response.json()) as { album?: EstadoFigurinhas; updatedAt?: string };

        if (ativo && dados.album) {
          setAlbum(dados.album);
          setLastSavedAt(dados.updatedAt ?? null);
        }
      } catch {
        if (ativo) {
          setMensagemBanco('Não foi possível carregar o álbum salvo no banco.');
        }
      } finally {
        if (ativo) {
          setCarregandoAlbum(false);
        }
      }
    };

    void carregarAlbum();

    const intervalo = setInterval(async () => {
      try {
        const res = await fetch('/api/album', { cache: 'no-store' });
        if (!res.ok) return;
        const dados = await res.json();
        const serverUpdatedAt = dados.updatedAt ?? null;

        if (serverUpdatedAt && serverUpdatedAt !== lastSavedAt) {
          // Server has a newer persisted album; update local view
          setAlbum(dados.album || {});
          setLastSavedAt(serverUpdatedAt);
        }
      } catch {
        // ignore polling errors
      }
    }, 8000);

    return () => {
      ativo = false;
      clearInterval(intervalo);
    };

    const desbloqueado = localStorage.getItem('album_copa_2026_autenticado');
    if (desbloqueado === 'true') {
      setAutenticado(true);
    }
  }, []);

  const salvarAlbum = (
    atualizar: (estadoAtual: EstadoFigurinhas) => EstadoFigurinhas,
  ) => {
    setAlbum((estadoAtual) => {
      const novoEstado = atualizar(estadoAtual);

      void (async () => {
        try {
          const response = await fetch('/api/album', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ album: novoEstado }),
          });

          if (!response.ok) {
            throw new Error('Falha ao salvar o álbum.');
          }

          const dados = await response.json();
          setMensagemBanco('');
          setLastSavedAt(dados.updatedAt ?? null);
        } catch {
          setMensagemBanco('Não foi possível salvar suas figurinhas no banco.');
        }
      })();

      return novoEstado;
    });
  };

  const adicionarFigurinha = (id: string) => {
    salvarAlbum((estadoAtual) => {
      const atual = estadoAtual[id]?.obtidas || 0;
      return { ...estadoAtual, [id]: { obtidas: atual + 1 } };
    });
  };

  const removerFigurinha = (id: string) => {
    salvarAlbum((estadoAtual) => {
      const atual = estadoAtual[id]?.obtidas || 0;
      if (atual === 0) return estadoAtual;

      return { ...estadoAtual, [id]: { obtidas: atual - 1 } };
    });
  };

  const secoesDisponiveis = useMemo(() => {
    const secoes = new Set(listaFigurinhas.map((f) => f.secao));
    return ['todas', ...Array.from(secoes)];
  }, []);

  const estatisticas = useMemo(() => {
    let preenchidas = 0;
    let repetidas = 0;
    const total = listaFigurinhas.length;

    listaFigurinhas.forEach((f) => {
      const qtd = album[f.id]?.obtidas || 0;
      if (qtd > 0) preenchidas++;
      if (qtd > 1) repetidas += qtd - 1;
    });

    return { total, preenchidas, faltantes: total - preenchidas, repetidas };
  }, [album]);

  const figurinhasFiltradas = useMemo(() => {
    return listaFigurinhas.filter((f) => {
      const qtd = album[f.id]?.obtidas || 0;
      const termo = busca.toLowerCase().trim();

      if (termo) {
        const bateComBusca =
          f.id.toLowerCase().includes(termo) ||
          f.numero.toLowerCase().includes(termo) ||
          (f.pais && f.pais.toLowerCase().includes(termo)) ||
          (f.jogador && f.jogador.toLowerCase().includes(termo)) ||
          (f.secao && f.secao.toLowerCase().includes(termo));

        if (!bateComBusca) return false;
      }

      if (filtroSecao !== 'todas' && f.secao !== filtroSecao) return false;

      if (filtroStatus === 'preenchidas' && qtd === 0) return false;
      if (filtroStatus === 'faltantes' && qtd > 0) return false;
      if (filtroStatus === 'repetidas' && qtd <= 1) return false;

      return true;
    });
  }, [album, filtroStatus, filtroSecao, busca]);

  const confirmarSenha = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    if (senhaDigitada === SENHA_PRINCIPAL) {
      setAutenticado(true);
      setMensagemSenha('');
      localStorage.setItem('album_copa_2026_autenticado', 'true');
      return;
    }

    setMensagemSenha('Senha incorreta.');
  };

  const copiarLinkPublico = async () => {
    try {
      // Ensure the current album is persisted before sharing
      await fetch('/api/album', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album }),
      });

      const url = `${window.location.origin}/compartilhar`;

      await navigator.clipboard.writeText(url);
      setMensagemLink('Link público copiado.');
      window.setTimeout(() => setMensagemLink(''), 2500);
    } catch {
      setMensagemLink('Não foi possível copiar o link.');
    }
  };

  const copiarLinkTroca = async () => {
    try {
      // Persist before sharing
      await fetch('/api/album', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album }),
      });

      const url = `${window.location.origin}/trocas`;

      await navigator.clipboard.writeText(url);
      setMensagemLink('Link de troca copiado.');
      window.setTimeout(() => setMensagemLink(''), 2500);
    } catch {
      setMensagemLink('Não foi possível copiar o link de troca.');
    }
  };

  const copiarLinkInteressados = async () => {
    try {
      // Persist before sharing
      await fetch('/api/album', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album }),
      });

      const url = `${window.location.origin}/interessados`;

      await navigator.clipboard.writeText(url);
      setMensagemLink('Link de interessados copiado.');
      window.setTimeout(() => setMensagemLink(''), 2500);
    } catch {
      setMensagemLink('Não foi possível copiar o link de interessados.');
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
            {obterAlbumTitulo()}
          </h1>
          <p className="text-gray-400 mb-6">
            Informe a senha para acessar e editar seu álbum.
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
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 border-b border-gray-800 pb-6 text-center lg:text-left lg:flex lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500">
              {obterAlbumTitulo()}
            </h1>
            <p className="text-gray-400 mt-1">
              Gerenciador pessoal de figurinhas
            </p>
            <div className="mt-4 flex flex-wrap gap-3 justify-center lg:justify-start">
              <button
                type="button"
                onClick={copiarLinkPublico}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
              >
                Copiar link público
              </button>
              <button
                type="button"
                onClick={copiarLinkTroca}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
              >
                Copiar link de troca
              </button>
              <button
                type="button"
                onClick={copiarLinkInteressados}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
              >
                Copiar link interessados
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('album_copa_2026_autenticado');
                  setAutenticado(false);
                }}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold transition-colors"
              >
                Bloquear novamente
              </button>
              <button
                type="button"
                onClick={() => setShowRecent((s) => !s)}
                className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 font-medium transition-colors"
              >
                {showRecent ? 'Ocultar últimas adições' : 'Mostrar últimas adições'}
              </button>
            </div>
            {mensagemLink && <p className="text-green-400 text-sm mt-2">{mensagemLink}</p>}
            {mensagemBanco && <p className="text-yellow-400 text-sm mt-2">{mensagemBanco}</p>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 lg:mt-0">
            <div className="bg-gray-800 p-3 rounded-xl border border-gray-700 text-center">
              <span className="text-xs text-gray-400 block uppercase font-bold">
                Total
              </span>
              <span className="text-xl font-bold text-blue-400">
                {estatisticas.total}
              </span>
            </div>
            <div className="bg-gray-800 p-3 rounded-xl border border-gray-700 text-center">
              <span className="text-xs text-gray-400 block uppercase font-bold">
                Tenho
              </span>
              <span className="text-xl font-bold text-green-400">
                {estatisticas.preenchidas} (
                {(
                  (estatisticas.preenchidas / estatisticas.total) *
                  100
                ).toFixed(1)}
                %)
              </span>
            </div>
            <div className="bg-gray-800 p-3 rounded-xl border border-gray-700 text-center">
              <span className="text-xs text-gray-400 block uppercase font-bold">
                Faltam
              </span>
              <span className="text-xl font-bold text-red-400">
                {estatisticas.faltantes}
              </span>
            </div>
            <div className="bg-gray-800 p-3 rounded-xl border border-gray-700 text-center">
              <span className="text-xs text-gray-400 block uppercase font-bold">
                Repetidas
              </span>
              <span className="text-xl font-bold text-yellow-400">
                {estatisticas.repetidas}
              </span>
            </div>
          </div>
          {/* toggle moved to left controls */}
        </header>

        {showRecent && <RecentAdditionsGrid />}

        {carregandoAlbum ? (
          <section className="bg-gray-800 p-4 rounded-2xl border border-gray-700 mb-6 text-center text-gray-400">
            Carregando álbum salvo no banco...
          </section>
        ) : null}

        <section className="bg-gray-800 p-4 rounded-2xl border border-gray-700 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
              Buscar jogador, código ou país:
            </label>
            <input
              type="text"
              placeholder="Ex: Alisson, BRA_10, México..."
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
              Filtrar por Status:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['todas', 'Todas', 'bg-red-600'],
                  ['preenchidas', 'Preenchidas', 'bg-green-600'],
                  ['faltantes', 'Faltantes', 'bg-indigo-600'],
                  ['repetidas', 'Repetidas (Troca)', 'bg-yellow-600'],
                ] as const
              ).map(([valor, label, ativo]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setFiltroStatus(valor)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filtroStatus === valor
                      ? `${ativo} ${valor === 'repetidas' ? 'text-gray-900' : 'text-white'}`
                      : 'bg-gray-900 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
              Seção do Álbum:
            </label>
            <select
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 capitalize"
              value={filtroSecao}
              onChange={(e) => setFiltroSecao(e.target.value)}
            >
              {secoesDisponiveis.map((sec) => (
                <option key={sec} value={sec}>
                  {sec === 'todas' ? 'Todas as Seções' : sec}
                </option>
              ))}
            </select>
          </div>
        </section>

        <main>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-300">
              Figurinhas Encontradas ({figurinhasFiltradas.length})
            </h2>
          </div>

          {figurinhasFiltradas.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-2xl border border-dashed border-gray-700">
              <p className="text-gray-400">
                Nenhuma figurinha corresponde aos filtros aplicados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {figurinhasFiltradas.map((fig) => (
                <FigurinhaCard
                  key={fig.id}
                  fig={fig}
                  qtd={album[fig.id]?.obtidas || 0}
                  onAdicionar={() => adicionarFigurinha(fig.id)}
                  onRemover={() => removerFigurinha(fig.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}



