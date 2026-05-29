import { NextResponse } from 'next/server';
import { aplicarTrocaNoAlbum } from '../../../lib/album-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { recebidas?: string[]; entregues?: string[] };
    const recebidas = Array.isArray(body.recebidas) ? body.recebidas.filter((x) => typeof x === 'string' && x.trim()) : [];
    const entregues = Array.isArray(body.entregues) ? body.entregues.filter((x) => typeof x === 'string' && x.trim()) : [];

    if (recebidas.length === 0 && entregues.length === 0) {
      return NextResponse.json({ error: 'Informe ao menos uma figurinha recebida ou entregue.' }, { status: 400 });
    }

    const updatedAt = await aplicarTrocaNoAlbum(recebidas, entregues);
    return NextResponse.json({ ok: true, updatedAt });
  } catch {
    return NextResponse.json({ error: 'Nao foi possivel concluir a troca.' }, { status: 500 });
  }
}

