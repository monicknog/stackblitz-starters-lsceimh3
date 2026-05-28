'use client';

import { useMemo, useState, type FormEvent } from 'react';

type FigurinhaOption = {
  id: string;
  jogador?: string | null;
  pais?: string;
  secao: string;
  tipo: string;
};

type Avaliacao = {
  scoreJustica: number;
  parecer: 'desfavoravel' | 'equilibrada' | 'favoravel';
  resumo: string;
  sugestoes: string[];
  recomendadas1por1?: string[];
  usadoGemini: boolean;
};

interface Props {
  figurinhas: FigurinhaOption[];
  pendentesSemCocaCola: string[];
}

export function AvaliarTrocaClient({ figurinhas, pendentesSemCocaCola }: Props) {
  const [minhaFigurinhaId, setMinhaFigurinhaId] = useState(figurinhas[0]?.id ?? '');
  const [oferecidaId, setOferecidaId] = useState(figurinhas[1]?.id ?? figurinhas[0]?.id ?? '');
  const [quantidadeOferecida, setQuantidadeOferecida] = useState(1);
  const [observacoes, setObservacoes] = useState('');
  const [modoSugestaoSemOferta, setModoSugestaoSemOferta] = useState(false);
  const [consultarGemini, setConsultarGemini] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);

  const minha = useMemo(
    () => figurinhas.find((f) => f.id === minhaFigurinhaId),
    [figurinhas, minhaFigurinhaId],
  );
  const oferta = useMemo(
    () => figurinhas.find((f) => f.id === oferecidaId),
    [figurinhas, oferecidaId],
  );

  const avaliar = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    setAvaliacao(null);
    setCarregando(true);

    try {
      const res = await fetch('/api/avaliar-troca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minhaFigurinhaId,
          oferecidaId,
          quantidadeOferecida,
          observacoes,
          modoSugestaoSemOferta,
          consultarGemini,
          figurinhasPendentesIds: modoSugestaoSemOferta ? pendentesSemCocaCola : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || 'Falha ao avaliar troca.');
        return;
      }

      setAvaliacao(data.avaliacao as Avaliacao);
    } catch {
      setErro('Nao foi possivel consultar a avaliacao agora.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 rounded-2xl border border-gray-700 bg-gray-800/60 p-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Avaliar troca com apoio de IA</h1>
          <p className="text-sm text-gray-400 mt-2">
            Informe a figurinha que querem sua e a proposta recebida. A analise sugere se a troca esta justa e como compensar.
          </p>
        </header>

        <form onSubmit={avaliar} className="rounded-2xl border border-gray-700 bg-gray-800 p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                Figurinha que querem sua
              </label>
              <select
                value={minhaFigurinhaId}
                onChange={(e) => setMinhaFigurinhaId(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
              >
                {figurinhas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.id} - {f.jogador || f.pais || f.secao} ({f.tipo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                Figurinha que estao oferecendo
              </label>
              <select
                value={oferecidaId}
                onChange={(e) => setOferecidaId(e.target.value)}
                disabled={modoSugestaoSemOferta}
                className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
              >
                {figurinhas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.id} - {f.jogador || f.pais || f.secao} ({f.tipo})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={modoSugestaoSemOferta}
              onChange={(e) => setModoSugestaoSemOferta(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-900"
            />
            Nao tenho oferta ainda, quero sugestoes de troca justa
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={consultarGemini}
              onChange={(e) => setConsultarGemini(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-900"
            />
            Consultar Gemini para analise e sugestoes
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Quantidade oferecida</label>
              <input
                type="number"
                min={1}
                value={quantidadeOferecida}
                onChange={(e) => setQuantidadeOferecida(Math.max(1, Number(e.target.value || 1)))}
                disabled={modoSugestaoSemOferta}
                className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Observacoes opcionais</label>
              <input
                type="text"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: jogador muito procurado no meu grupo"
                className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {minha && oferta ? (
            <p className="text-xs text-gray-400">
              Comparando: <span className="text-white font-semibold">{minha.id}</span> ({minha.tipo}) por{' '}
              <span className="text-white font-semibold">{quantidadeOferecida}x {oferta.id}</span> ({oferta.tipo})
            </p>
          ) : minha && modoSugestaoSemOferta ? (
            <p className="text-xs text-gray-400">
              Modo sugestao: analisando apenas sua figurinha <span className="text-white font-semibold">{minha.id}</span> ({minha.tipo}).
            </p>
          ) : null}

          <button
            type="submit"
            disabled={carregando}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {carregando ? 'Avaliando...' : 'Avaliar troca'}
          </button>
        </form>

        {erro ? (
          <div className="mt-4 rounded-xl border border-red-800 bg-red-950/40 p-3 text-red-300 text-sm">{erro}</div>
        ) : null}

        {avaliacao ? (
          <section className="mt-4 rounded-2xl border border-gray-700 bg-gray-800 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className={`rounded px-2 py-1 text-xs font-bold uppercase ${
                  avaliacao.parecer === 'favoravel'
                    ? 'bg-emerald-600/30 text-emerald-300'
                    : avaliacao.parecer === 'desfavoravel'
                      ? 'bg-red-600/30 text-red-300'
                      : 'bg-yellow-600/30 text-yellow-300'
                }`}
              >
                {avaliacao.parecer}
              </span>
              <span className="rounded bg-gray-700 px-2 py-1 text-xs font-semibold text-gray-200">
                Score de justica: {avaliacao.scoreJustica}/100
              </span>
              <span className="rounded bg-gray-700 px-2 py-1 text-xs font-semibold text-gray-200">
                Motor: {avaliacao.usadoGemini ? 'Gemini' : 'Heuristica local'}
              </span>
            </div>

            <p className="text-sm text-gray-200 mb-3">{avaliacao.resumo}</p>
            <h2 className="text-sm font-bold text-gray-300 uppercase mb-2">Sugestoes de contraproposta</h2>
            <ul className="space-y-2 text-sm text-gray-200">
              {avaliacao.sugestoes.map((s, idx) => (
                <li key={`${idx}-${s}`} className="rounded-lg border border-gray-700 bg-gray-900/60 px-3 py-2">
                  {s}
                </li>
              ))}
            </ul>

            {avaliacao.recomendadas1por1 && avaliacao.recomendadas1por1.length > 0 ? (
              <>
                <h2 className="text-sm font-bold text-gray-300 uppercase mt-4 mb-2">Possiveis trocas 1x1</h2>
                <ul className="space-y-2 text-sm text-gray-200">
                  {avaliacao.recomendadas1por1.map((s, idx) => (
                    <li key={`1x1-${idx}-${s}`} className="rounded-lg border border-gray-700 bg-gray-900/60 px-3 py-2">
                      {s}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
