'use client';

import Link from 'next/link';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ClearableTextInput } from './components/ClearableTextInput';
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
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [mensagemBanco, setMensagemBanco] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [showRecent, setShowRecent] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [secaoAberta, setSecaoAberta] = useState<Record<string, boolean>>({});
  const lastSavedAtRef = useRef<string | null>(null);

  useEffect(() => {
    lastSavedAtRef.current = lastSavedAt;
  }, [lastSavedAt]);

  useEffect(() => {
    let ativo = true;

    const desbloqueado = localStorage.getItem('album_copa_2026_autenticado');
    if (desbloqueado === 'true') {
      setAutenticado(true);
    }

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

        if (serverUpdatedAt && serverUpdatedAt !== lastSavedAtRef.current) {
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
    const paises = Array.from(new Set(listaFigurinhas.map((f) => f.pais).filter(Boolean) as string[]))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((pais) => ({ value: pais, label: pais }));
    return [{ value: 'todas', label: 'Todas as seleções' }, ...paises];
  }, []);

  const estatisticas = useMemo(() => {
    let preenchidas = 0;
    let repetidas = 0;
    let cartasRepetidas = 0;
    const total = listaFigurinhas.length;

    listaFigurinhas.forEach((f) => {
      const qtd = album[f.id]?.obtidas || 0;
      if (qtd > 0) preenchidas++;
      if (qtd > 1) {
        repetidas += qtd - 1;
        cartasRepetidas += 1;
      }
    });

    return { total, preenchidas, faltantes: total - preenchidas, repetidas, cartasRepetidas };
  }, [album]);

  const rankingSelecoes = useMemo(() => {
    const mapa = new Map<string, { total: number; preenchidas: number }>();

    listaFigurinhas.forEach((f) => {
      if (!f.pais) return;
      const atual = mapa.get(f.pais) ?? { total: 0, preenchidas: 0 };
      atual.total += 1;
      if ((album[f.id]?.obtidas || 0) > 0) {
        atual.preenchidas += 1;
      }
      mapa.set(f.pais, atual);
    });

    return Array.from(mapa.entries())
      .map(([pais, dados]) => {
        const faltam = dados.total - dados.preenchidas;
        const percentual = dados.total > 0 ? (dados.preenchidas / dados.total) * 100 : 0;
        return { pais, total: dados.total, preenchidas: dados.preenchidas, faltam, percentual };
      })
      .sort((a, b) => a.faltam - b.faltam || b.percentual - a.percentual || a.pais.localeCompare(b.pais, 'pt-BR'));
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

      if (filtroSecao !== 'todas' && f.pais !== filtroSecao) return false;

      if (filtroStatus === 'preenchidas' && qtd === 0) return false;
      if (filtroStatus === 'faltantes' && qtd > 0) return false;
      if (filtroStatus === 'repetidas' && qtd <= 1) return false;

      return true;
    });
  }, [album, filtroStatus, filtroSecao, busca]);

  const figurinhasAgrupadas = useMemo(() => {
    const grupos = new Map<string, typeof listaFigurinhas>();

    figurinhasFiltradas.forEach((fig) => {
      const chave = fig.pais || fig.sigla || 'Sem seleção';
      const itens = grupos.get(chave);

      if (itens) {
        itens.push(fig);
        return;
      }

      grupos.set(chave, [fig]);
    });

    return Array.from(grupos.entries()).map(([secao, itens]) => ({ secao, itens }));
  }, [figurinhasFiltradas]);

  useEffect(() => {
    setSecaoAberta((estadoAtual) => {
      const proximo: Record<string, boolean> = {};

      figurinhasAgrupadas.forEach(({ secao }, indice) => {
        proximo[secao] = estadoAtual[secao] ?? indice === 0;
      });

      return proximo;
    });
  }, [figurinhasAgrupadas]);

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

  const montarUrlCompartilhada = async (caminho: string) => {
    const url = new URL(caminho, window.location.origin);

    url.searchParams.set('s', '1');

    return url.toString();
  };

  const copiarLinkPublico = async () => {
    try {
      // Ensure the current album is persisted before sharing
      await fetch('/api/album', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album }),
      });

      const url = await montarUrlCompartilhada('/compartilhar');

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

      const url = await montarUrlCompartilhada('/trocas');

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

      const url = await montarUrlCompartilhada('/interessados');

      await navigator.clipboard.writeText(url);
      setMensagemLink('Link de interessados copiado.');
      window.setTimeout(() => setMensagemLink(''), 2500);
    } catch {
      setMensagemLink('Não foi possível copiar o link de interessados.');
    }
  };

  const enviarLink = async (
    caminho: '/compartilhar' | '/trocas' | '/interessados',
    titulo: string,
    texto: string,
    mensagemSucesso: string,
    mensagemFalha: string,
  ) => {
    try {
      await fetch('/api/album', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album }),
      });

      const url = await montarUrlCompartilhada(caminho);

      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share({ title: titulo, text: texto, url });
        setMensagemLink(mensagemSucesso);
      } else if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
        await (navigator as any).clipboard.writeText(url);
        setMensagemLink(`${mensagemSucesso} (copiado)`);
      } else {
        setMensagemLink(`${mensagemSucesso} (não suportado)`);
      }

      window.setTimeout(() => setMensagemLink(''), 2500);
    } catch {
      setMensagemLink(mensagemFalha);
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
            <div className="mt-4 space-y-3">
              <div className="lg:hidden flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowMobileMenu((v) => !v)}
                  className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 font-semibold transition-colors"
                >
                  Menu
                </button>
              </div>
              <nav className={`${showMobileMenu ? 'flex' : 'hidden'} lg:flex flex-wrap gap-2 justify-center lg:justify-start`}>
                <Link href="/" className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 font-medium transition-colors">Album</Link>
                <Link href="/trocas" className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 font-medium transition-colors">Trocas</Link>
                <Link href="/interessados" className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 font-medium transition-colors">Interessados</Link>
                <Link href="/compartilhar" className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 font-medium transition-colors">Publico</Link>
                <Link href="/historico" className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 font-medium transition-colors">Historico</Link>
                <Link href="/faltantes-resumo" className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 font-medium transition-colors">Resumo faltantes</Link>
                <Link href="/disponiveis-resumo" className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 font-medium transition-colors">Resumo trocas</Link>
                <Link href="/avaliar-troca" className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-sm text-white font-medium transition-colors">Avaliar troca</Link>
              </nav>
              <div className={`${showMobileMenu ? 'flex' : 'hidden'} lg:flex flex-wrap gap-3 justify-center lg:justify-start`}>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowShareMenu((v) => !v)}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
                  >
                    Compartilhar
                  </button>
                  {showShareMenu ? (
                    <div className="absolute z-20 mt-2 w-64 rounded-lg border border-gray-700 bg-gray-900 shadow-2xl p-2">
                      <button type="button" onClick={copiarLinkPublico} className="w-full text-left px-3 py-2 rounded hover:bg-gray-800 text-sm text-gray-200">Copiar link publico</button>
                      <button type="button" onClick={() => enviarLink('/compartilhar', 'Album', 'Veja meu album de figurinhas', 'Link publico enviado.', 'Nao foi possivel enviar o link.')} className="w-full text-left px-3 py-2 rounded hover:bg-gray-800 text-sm text-gray-200">Enviar link publico</button>
                      <button type="button" onClick={copiarLinkTroca} className="w-full text-left px-3 py-2 rounded hover:bg-gray-800 text-sm text-gray-200">Copiar link de troca</button>
                      <button type="button" onClick={() => enviarLink('/trocas', 'Trocas', 'Veja minhas figurinhas para troca', 'Link de troca enviado.', 'Nao foi possivel enviar o link de troca.')} className="w-full text-left px-3 py-2 rounded hover:bg-gray-800 text-sm text-gray-200">Enviar link de troca</button>
                      <button type="button" onClick={copiarLinkInteressados} className="w-full text-left px-3 py-2 rounded hover:bg-gray-800 text-sm text-gray-200">Copiar link interessados</button>
                      <button type="button" onClick={() => enviarLink('/interessados', 'Interessados', 'Acompanhe os interessados em troca', 'Link de interessados enviado.', 'Nao foi possivel enviar o link de interessados.')} className="w-full text-left px-3 py-2 rounded hover:bg-gray-800 text-sm text-gray-200">Enviar link interessados</button>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecent((s) => !s)}
                  className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 font-medium transition-colors"
                >
                  {showRecent ? 'Ocultar ultimas adicoes' : 'Mostrar ultimas adicoes'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRankingModal(true)}
                  className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm text-white font-medium transition-colors"
                >
                  Ranking selecoes
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
              </div>
            </div>
            <div className="hidden mt-4 flex flex-wrap gap-3 justify-center lg:justify-start">
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
              <Link
                href="/avaliar-troca"
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors"
              >
                Avaliar Troca
              </Link>
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

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6 lg:mt-0">
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
                Cópias repetidas
              </span>
              <span className="text-xl font-bold text-yellow-400">
                {estatisticas.repetidas}
              </span>
            </div>
            <div className="bg-gray-800 p-3 rounded-xl border border-gray-700 text-center">
              <span className="text-xs text-gray-400 block uppercase font-bold">
                Cartas repetidas
              </span>
              <span className="text-xl font-bold text-orange-400">
                {estatisticas.cartasRepetidas}
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
            <ClearableTextInput
              placeholder="Ex: Alisson, BRA_10, México..."
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
              value={busca}
              onChange={setBusca}
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
              Seleção / País:
            </label>
            <select
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 capitalize"
              value={filtroSecao}
              onChange={(e) => setFiltroSecao(e.target.value)}
            >
              {secoesDisponiveis.map((sec) => (
                <option key={sec.value} value={sec.value}>
                  {sec.label}
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
            <div className="space-y-4">
              {figurinhasAgrupadas.map(({ secao, itens }) => {
                const aberta = secaoAberta[secao] ?? false;
                const totalSecao = itens.length;
                const preenchidasSecao = itens.reduce((acc, fig) => {
                  return acc + ((album[fig.id]?.obtidas || 0) > 0 ? 1 : 0);
                }, 0);

                return (
                  <section
                    key={secao}
                    className="rounded-2xl border border-gray-700 bg-gray-800 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSecaoAberta((estadoAtual) => ({
                          ...estadoAtual,
                          [secao]: !(estadoAtual[secao] ?? false),
                        }))
                      }
                      className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-gray-700/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-white truncate">
                          {secao}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-400">
                          {preenchidasSecao}/{totalSecao} figurinhas visíveis neste bloco
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-gray-300 border border-gray-700">
                          {totalSecao}
                        </span>
                        <span className="text-gray-400 text-sm">{aberta ? '▾' : '▸'}</span>
                      </div>
                    </button>

                    {aberta ? (
                      <div className="border-t border-gray-700 p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
                          {itens.map((fig) => (
                            <FigurinhaCard
                              key={fig.id}
                              fig={fig}
                              qtd={album[fig.id]?.obtidas || 0}
                              onAdicionar={() => adicionarFigurinha(fig.id)}
                              onRemover={() => removerFigurinha(fig.id)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {showRankingModal ? (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <h2 className="text-sm sm:text-base font-semibold text-white">Ranking de selecoes mais proximas</h2>
              <button
                type="button"
                onClick={() => setShowRankingModal(false)}
                className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs"
              >
                Fechar
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-3 sm:p-4">
              <div className="space-y-2">
                {rankingSelecoes.map((item, idx) => (
                  <div key={item.pais} className="rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">
                        {idx + 1}. {item.pais}
                      </p>
                      <p className="text-xs text-gray-400">
                        {item.preenchidas}/{item.total} preenchidas
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-amber-400">Faltam {item.faltam}</p>
                      <p className="text-xs text-gray-400">{item.percentual.toFixed(0)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
