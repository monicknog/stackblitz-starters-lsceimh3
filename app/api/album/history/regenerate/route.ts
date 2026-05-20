import { NextResponse } from 'next/server';
import { gerarHistoricoAPartirDoAlbum } from '../../../../lib/album-db';

export async function POST() {
  try {
    const count = await gerarHistoricoAPartirDoAlbum();
    return NextResponse.json({ ok: true, inserted: count });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
