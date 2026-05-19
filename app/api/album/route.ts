import { NextResponse } from 'next/server';

import { carregarAlbumComMeta, salvarAlbumNoBanco } from '../../lib/album-db';
import type { EstadoFigurinhas } from '../../lib/album';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { album, updatedAt } = await carregarAlbumComMeta();
  return NextResponse.json({ album, updatedAt });
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

    const updatedAt = await salvarAlbumNoBanco(body.album);
    return NextResponse.json({ ok: true, updatedAt });
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível salvar o álbum.' },
      { status: 500 },
    );
  }
}