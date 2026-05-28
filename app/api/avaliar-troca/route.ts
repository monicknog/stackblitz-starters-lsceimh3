import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { listaFigurinhas } from '../../lib/album';

type Body = {
  minhaFigurinhaId?: string;
  oferecidaId?: string;
  quantidadeOferecida?: number;
  observacoes?: string;
  modoSugestaoSemOferta?: boolean;
  consultarGemini?: boolean;
  figurinhasPendentesIds?: string[];
};

type Avaliacao = {
  scoreJustica: number;
  parecer: 'desfavoravel' | 'equilibrada' | 'favoravel';
  resumo: string;
  sugestoes: string[];
  recomendadas1por1?: string[];
  usadoGemini: boolean;
};

const STAR_PLAYERS = [
  'Vinícius Júnior',
  'Lionel Messi',
  'Cristiano Ronaldo',
  'Kylian Mbappé',
  'Luka Modric',
  'Erling Haaland',
  'Lamine Yamal',
  'Jude Bellingham',
  'Mohamed Salah',
  'Federico Valverde',
  'Jeremy Doku',
  'Harry Kane',
  'Christian Pulisic',
  'Alphonso Davies',
  'Son Heung-min',
  'Achraf Hakimi',
  'Moises Caicedo',
  'Florian Wirtz',
  'Cody Gakpo',
  'Santiago Giménez',
];

function normalizar(texto: string | null | undefined) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokenize(texto: string) {
  return normalizar(texto).split(' ').filter(Boolean);
}

function valorBase(tipo: string | undefined) {
  const t = normalizar(tipo);
  if (t.includes('brilhante')) return 5;
  if (t.includes('especial')) return 3;
  return 1;
}

function bonusEstrategico(nomeJogador: string | null | undefined) {
  const nomeNormalizado = normalizar(nomeJogador);
  const tokensNome = new Set(tokenize(nomeNormalizado));

  return STAR_PLAYERS.some((star) => {
    const starNormalizado = normalizar(star);
    if (nomeNormalizado.includes(starNormalizado)) return true;

    const tokensStar = tokenize(starNormalizado);
    return tokensStar.length > 0 && tokensStar.every((t) => tokensNome.has(t));
  })
    ? 2
    : 0;
}

function valorFigurinha(fig: (typeof listaFigurinhas)[number] | undefined) {
  if (!fig) return 1;
  return valorBase(fig.tipo) + bonusEstrategico(fig.jogador);
}

function limitarScore(v: number) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function avaliarHeuristica(
  minha: (typeof listaFigurinhas)[number],
  oferecida: (typeof listaFigurinhas)[number],
  quantidade: number,
): Avaliacao {
  const valorMinha = valorFigurinha(minha);
  const valorOferecida = valorFigurinha(oferecida) * quantidade;
  const ratio = valorOferecida / Math.max(1, valorMinha);
  const score = limitarScore(ratio * 100);

  let parecer: Avaliacao['parecer'] = 'equilibrada';
  if (score < 85) parecer = 'desfavoravel';
  if (score > 115) parecer = 'favoravel';

  const faltante = Math.max(0, valorMinha - valorOferecida);
  const resumo =
    score < 85
      ? `Troca abaixo do valor estrategico esperado. Sua figurinha foi estimada em ${valorMinha} ponto(s), oferta em ${valorOferecida} ponto(s).`
      : score > 115
        ? `Troca boa para voce. Sua figurinha foi estimada em ${valorMinha} ponto(s), oferta em ${valorOferecida} ponto(s).`
        : `Troca proxima do equilibrio. Sua figurinha foi estimada em ${valorMinha} ponto(s), oferta em ${valorOferecida} ponto(s).`;

  const sugestoes = [
    `Se for somente comum: pedir ${Math.max(1, Math.ceil(valorMinha / 1))} figurinha(s) comum(ns).`,
    `Se for especial: pedir ${Math.max(1, Math.ceil(valorMinha / 3))} figurinha(s) especial(is).`,
    `Se for brilhante: pedir ${Math.max(1, Math.ceil(valorMinha / 5))} figurinha(s) brilhante(s).`,
  ];

  if (faltante > 0) {
    sugestoes.unshift(
      `Para igualar a proposta atual, faltam cerca de ${faltante} ponto(s) de valor. Compense com comuns, especiais ou brilhantes.`,
    );
  }

  return { scoreJustica: score, parecer, resumo, sugestoes, usadoGemini: false };
}

function parseGeminiJson(texto: string) {
  const limpo = texto.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '');
  return JSON.parse(limpo) as Omit<Avaliacao, 'usadoGemini'>;
}

function sugerirTrocasSemOferta(minha: (typeof listaFigurinhas)[number]): Avaliacao {
  const valorMinha = valorFigurinha(minha);
  const candidatas = listaFigurinhas
    .filter((f) => f.id !== minha.id)
    .map((f) => ({ fig: f, valor: valorFigurinha(f) }))
    .filter((item) => item.valor >= valorMinha)
    .sort((a, b) => {
      const diffA = itemDiff(a.valor, valorMinha);
      const diffB = itemDiff(b.valor, valorMinha);
      if (diffA !== diffB) return diffA - diffB;
      return (a.fig.jogador || a.fig.pais || a.fig.id).localeCompare(
        b.fig.jogador || b.fig.pais || b.fig.id,
        'pt-BR',
      );
    })
    .slice(0, 8);

  const recomendadas1por1 = candidatas.map((item) => {
    const nome = item.fig.jogador || item.fig.pais || item.fig.secao || item.fig.id;
    return `${item.fig.id} - ${nome} (${item.fig.tipo})`;
  });

  const sugestoes = [
    `Para valor equivalente em comuns, aceite a partir de ${Math.max(1, Math.ceil(valorMinha / 1))} unidade(s).`,
    `Para especiais, aceite a partir de ${Math.max(1, Math.ceil(valorMinha / 3))} unidade(s).`,
    `Para brilhantes, aceite a partir de ${Math.max(1, Math.ceil(valorMinha / 5))} unidade(s).`,
  ];

  return {
    scoreJustica: 100,
    parecer: 'equilibrada',
    resumo: `Sem oferta informada: estimamos sua figurinha em ${valorMinha} ponto(s) e sugerimos referencias de troca justa, incluindo opcoes 1x1.`,
    sugestoes,
    recomendadas1por1,
    usadoGemini: false,
  };
}

function itemDiff(a: number, b: number) {
  return Math.abs(a - b);
}

async function avaliarComGemini(
  minha: (typeof listaFigurinhas)[number],
  oferecida: (typeof listaFigurinhas)[number],
  quantidade: number,
  observacoes: string,
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const valorMinha = valorFigurinha(minha);
  const valorOferta = valorFigurinha(oferecida) * quantidade;

  const genAI = new GoogleGenAI({ apiKey });
  const modelos = ['gemini-flash-latest','gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash'];

  const prompt = `
Voce eh um especialista em trocas de album de figurinhas.
Analise a troca e retorne SOMENTE JSON valido, sem markdown.

Contexto:
- Minha figurinha: ${minha.id} | ${minha.jogador ?? minha.pais ?? minha.secao} | tipo: ${minha.tipo}
- Figurinha oferecida: ${oferecida.id} | ${oferecida.jogador ?? oferecida.pais ?? oferecida.secao} | tipo: ${oferecida.tipo}
- Quantidade oferecida: ${quantidade}
- Valor base estimado (heuristica local): minha=${valorMinha}, oferta=${valorOferta}
- Observacoes do usuario: ${observacoes || 'nenhuma'}

Retorne neste formato:
{
  "scoreJustica": number, // 0 a 100
  "parecer": "desfavoravel" | "equilibrada" | "favoravel",
  "resumo": "texto curto em portugues",
  "sugestoes": ["sugestao 1", "sugestao 2", "sugestao 3"]
}

Regras:
- Se minha figurinha for claramente mais estrategica, sugira compensacoes em numero de comuns/especiais/brilhantes.
- Seja objetivo e pratico.
`;

  let ultimoErro: unknown = null;
  const tentativas: Array<{ model: string; error: string }> = [];
  for (const modelName of modelos) {
    try {
      const result = await genAI.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      const text = typeof result.text === 'string' ? result.text : '';
      if (!text.trim()) {
        throw new Error(`RESPOSTA_VAZIA_${modelName}`);
      }
      const parsed = parseGeminiJson(text);

      return {
        scoreJustica: limitarScore(parsed.scoreJustica),
        parecer: parsed.parecer,
        resumo: String(parsed.resumo || ''),
        sugestoes: Array.isArray(parsed.sugestoes) ? parsed.sugestoes.slice(0, 5).map(String) : [],
        usadoGemini: true,
      } satisfies Avaliacao;
    } catch (error) {
      ultimoErro = error;
      tentativas.push({
        model: modelName,
        error: error instanceof Error ? error.message.slice(0, 180) : String(error).slice(0, 180),
      });
    }
  }

  const base = ultimoErro instanceof Error ? ultimoErro.message : String(ultimoErro ?? 'NENHUM_MODELO_GEMINI_DISPONIVEL');
  throw new Error(`${base} | tentativas=${JSON.stringify(tentativas)}`);
}

async function avaliarSemOfertaComGemini(
  minha: (typeof listaFigurinhas)[number],
  pendentes: (typeof listaFigurinhas)[number][],
  observacoes: string,
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const genAI = new GoogleGenAI({ apiKey });
  const modelos = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
  const pendentesTexto = pendentes
    .slice(0, 250)
    .map((f) => `${f.id} - ${f.jogador ?? f.pais ?? f.secao} (${f.tipo})`)
    .join('\n');

  const prompt = `
Analise troca sem oferta informada e retorne SOMENTE JSON valido.
Minha figurinha: ${minha.id} - ${minha.jogador ?? minha.pais ?? minha.secao} (${minha.tipo})
Pendentes do usuario (sem Coca-Cola):
${pendentesTexto}
Observacoes: ${observacoes || 'nenhuma'}
Formato:
{"scoreJustica":100,"parecer":"equilibrada","resumo":"texto","sugestoes":["a","b","c"],"recomendadas1por1":["ID - Nome","ID - Nome"]}
Regras:
- Sugira trocas entre as pendentes fornecidas.
- Nao incluir itens fora da lista.
- Priorize opcoes 1x1 para carta estrategica.
`;

  let ultimoErro: unknown = null;
  for (const modelName of modelos) {
    try {
      const result = await genAI.models.generateContent({ model: modelName, contents: prompt });
      const text = typeof result.text === 'string' ? result.text : '';
      if (!text.trim()) throw new Error(`RESPOSTA_VAZIA_${modelName}`);
      const parsed = parseGeminiJson(text);
      return {
        scoreJustica: limitarScore(parsed.scoreJustica),
        parecer: parsed.parecer,
        resumo: String(parsed.resumo || ''),
        sugestoes: Array.isArray(parsed.sugestoes) ? parsed.sugestoes.slice(0, 6).map(String) : [],
        recomendadas1por1: Array.isArray(parsed.recomendadas1por1)
          ? parsed.recomendadas1por1.slice(0, 10).map(String)
          : [],
        usadoGemini: true,
      } satisfies Avaliacao;
    } catch (error) {
      ultimoErro = error;
    }
  }

  throw ultimoErro instanceof Error ? ultimoErro : new Error('SEM_MODELO_GEMINI_SEM_OFERTA');
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const minhaId = normalizar(body.minhaFigurinhaId);
    const oferecidaId = normalizar(body.oferecidaId);
    const quantidade = Math.max(1, Number(body.quantidadeOferecida || 1));
    const observacoes = String(body.observacoes ?? '').trim();
    const modoSugestaoSemOferta = Boolean(body.modoSugestaoSemOferta);
    const consultarGemini = Boolean(body.consultarGemini);
    const pendentesIds = Array.isArray(body.figurinhasPendentesIds) ? body.figurinhasPendentesIds : [];

    if (!minhaId || (!modoSugestaoSemOferta && !oferecidaId)) {
      return NextResponse.json(
        { error: 'Selecione a figurinha que querem sua e a figurinha oferecida.' },
        { status: 400 },
      );
    }

    const minha = listaFigurinhas.find((f) => normalizar(f.id) === minhaId);
    const oferecida = modoSugestaoSemOferta
      ? undefined
      : listaFigurinhas.find((f) => normalizar(f.id) === oferecidaId);

    if (!minha || (!modoSugestaoSemOferta && !oferecida)) {
      return NextResponse.json({ error: 'Uma das figurinhas informadas e invalida.' }, { status: 400 });
    }

    if (modoSugestaoSemOferta && minha) {
      if (consultarGemini) {
        const pendentes = pendentesIds
          .map((id) => listaFigurinhas.find((f) => f.id === id))
          .filter((f): f is (typeof listaFigurinhas)[number] => Boolean(f))
          .filter((f) => !f.id.startsWith('CC'));
        try {
          const geminiSemOferta = await avaliarSemOfertaComGemini(minha, pendentes, observacoes);
          if (geminiSemOferta) {
            return NextResponse.json({ ok: true, avaliacao: geminiSemOferta });
          }
        } catch {
          // fallback heuristico abaixo
        }
      }
      const sugestao = sugerirTrocasSemOferta(minha);
      return NextResponse.json({ ok: true, avaliacao: sugestao });
    }

    const fallback = avaliarHeuristica(minha, oferecida as (typeof listaFigurinhas)[number], quantidade);

    let debugReason = 'fallback_sem_tentativa';
    let debugErrorMessage = '';
    try {
      const gemini = consultarGemini ? await avaliarComGemini(minha, oferecida, quantidade, observacoes) : null;
      if (gemini) {
        if (process.env.NODE_ENV !== 'production') {
          return NextResponse.json({ ok: true, avaliacao: gemini, debug: { used: 'gemini' } });
        }
        return NextResponse.json({ ok: true, avaliacao: gemini });
      }
      debugReason = 'gemini_sem_chave';
    } catch (error) {
      debugReason = 'erro_na_chamada_gemini';
      debugErrorMessage = error instanceof Error ? error.message.slice(0, 4000) : String(error).slice(0, 4000);
      // fallback below
    }

    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({
        ok: true,
        avaliacao: fallback,
        debug: {
          used: 'fallback',
          reason: debugReason,
          hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
          errorMessage: debugErrorMessage || undefined,
        },
      });
    }

    return NextResponse.json({ ok: true, avaliacao: fallback });
  } catch {
    return NextResponse.json({ error: 'Nao foi possivel avaliar a troca.' }, { status: 500 });
  }
}
