import { NextResponse } from 'next/server';

import type { EstadoFigurinhas } from '../../../../lib/album';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { album?: EstadoFigurinhas };

    if (!body.album || typeof body.album !== 'object') {
      return NextResponse.json(
        { error: 'O álbum enviado é inválido.' },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, code: '1' });
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível gerar o link compartilhado.' },
      { status: 500 },
    );
  }
}