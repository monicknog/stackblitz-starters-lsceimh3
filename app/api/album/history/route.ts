import { NextResponse } from 'next/server';
import { listarHistoricoAlteracoes } from '../../../lib/album-db';

export async function GET() {
  try {
    const items = await listarHistoricoAlteracoes(20);
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
