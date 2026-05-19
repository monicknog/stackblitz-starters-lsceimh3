import { NextResponse } from 'next/server';

import {
  atualizarStatusInteresse,
  listarInteressesDeTroca,
  salvarInteresseDeTroca,
} from '../../lib/album-db';
import { listaFigurinhas } from '../../lib/album';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const interesses = await listarInteressesDeTroca();
  return NextResponse.json({ interesses });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      nome?: string;
      figurinhaDesejadaId?: string;
      figurinhaOfertadaId?: string;
    };

    const nome = body.nome?.trim();
    const figurinhaDesejadaId = body.figurinhaDesejadaId?.trim();
    const figurinhaOfertadaId = body.figurinhaOfertadaId?.trim();

    if (!nome || !figurinhaDesejadaId || !figurinhaOfertadaId) {
      return NextResponse.json(
        { error: 'Nome, figurinha desejada e figurinha ofertada são obrigatórios.' },
        { status: 400 },
      );
    }

    const figurinhaDesejada = listaFigurinhas.find((item) => item.id === figurinhaDesejadaId);
    const figurinhaOfertada = listaFigurinhas.find((item) => item.id === figurinhaOfertadaId);

    if (!figurinhaDesejada) {
      return NextResponse.json(
        { error: 'A figurinha desejada selecionada é inválida.' },
        { status: 400 },
      );
    }

    if (!figurinhaOfertada) {
      return NextResponse.json(
        { error: 'A figurinha ofertada selecionada é inválida.' },
        { status: 400 },
      );
    }

    try {
      const registro = await salvarInteresseDeTroca({
        nome,
        figurinhaDesejadaId: figurinhaDesejada.id,
        figurinhaDesejadaNome: figurinhaDesejada.jogador || figurinhaDesejada.id,
        figurinhaOfertadaId: figurinhaOfertada.id,
        figurinhaOfertadaNome: figurinhaOfertada.jogador || figurinhaOfertada.id,
      });

      return NextResponse.json({ ok: true, interesse: registro });
    } catch (erro) {
      if (erro instanceof Error && erro.message === 'RESERVA_INDISPONIVEL') {
        return NextResponse.json(
          { error: 'Essa figurinha acabou de ser reservada por outra pessoa.' },
          { status: 409 },
        );
      }

      if (erro instanceof Error && erro.message === 'NOME_OBRIGATORIO') {
        return NextResponse.json(
          { error: 'Nome é obrigatório.' },
          { status: 400 },
        );
      }

      throw erro;
    }
    } catch (err) {
      // Log and return the underlying error message to help diagnosis
      // (safe for development; can be softened for production)
      // eslint-disable-next-line no-console
      console.error('Erro ao salvar interesse:', err);

      const mensagem = err instanceof Error ? err.message : String(err);

      return NextResponse.json(
        { error: `Não foi possível salvar o interesse: ${mensagem}` },
        { status: 500 },
      );
    }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { interesseId?: string; status?: 'rejeitado' | 'aceito' };

    const interesseId = body.interesseId?.trim();
    const status = body.status;

    if (!interesseId || !status) {
      return NextResponse.json(
        { error: 'ID do interesse e status são obrigatórios.' },
        { status: 400 },
      );
    }

    await atualizarStatusInteresse(interesseId, status);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível atualizar o interesse.' },
      { status: 500 },
    );
  }
}