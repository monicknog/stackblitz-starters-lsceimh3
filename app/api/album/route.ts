import { NextResponse } from 'next/server';

import { carregarAlbumDoBanco, salvarAlbumNoBanco } from '../../lib/album-db';
import type { EstadoFigurinhas } from '../../lib/album';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const album = await carregarAlbumDoBanco();
  return NextResponse.json({ album });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { album?: EstadoFigurinhas };

    if (!body.album || typeof body.album !== 'object') {
      return NextResponse.json(
        { error: 'O álbum enviado é inválido.' },
        { status: 400 },
      );
    }

    await salvarAlbumNoBanco(body.album);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível salvar o álbum.' },
      { status: 500 },
    );
  }
}