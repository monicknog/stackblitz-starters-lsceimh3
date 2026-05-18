import fs from 'fs';
import path from 'path';

const inputPath = path.join(process.cwd(), 'src', 'figurinhas-com-jogadores.json');
const outPath = path.join(process.cwd(), 'src', 'figurinhas-album.json');

if (!fs.existsSync(inputPath)) {
  console.error('Input file not found:', inputPath);
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf8');
const data = JSON.parse(raw);

const times = data.times || {};
const results = [];

function isEscudo(f) {
  return (f.numero && String(f.numero).toLowerCase() === 'escudo') || (f.id && String(f.id).toUpperCase().endsWith('_ESCUDO')) || (f.tipo && f.tipo.toLowerCase().includes('escudo'));
}

function isFotoOficial(f) {
  return (f.tipojogador && String(f.tipojogador).toLowerCase().includes('foto')) || (f.jogador && String(f.jogador).toLowerCase().includes('foto oficial')) || (f.tipo && String(f.tipo).toLowerCase().includes('foto'));
}

for (const [sigla, info] of Object.entries(times)) {
  const figurinhas = (info.figurinhas || []).map(f => ({ ...f }));

  // We'll walk the original order and perform minimal shifts when numeric duplicates happen.
  const seen = new Set();

  for (let i = 0; i < figurinhas.length; i++) {
    const f = figurinhas[i];

    // Normalize escudo
    if (isEscudo(f)) {
      f.numero = 'Escudo';
      f.id = `${sigla}_ESCUDO`;
      f.sigla = sigla;
      f.secao = f.secao ?? info.secao ?? null;
      f.pais = f.pais ?? info.pais ?? null;
      f.tipo = f.tipo ?? 'Brilhante/Escudo';
      f.tipojogador = f.tipoJogador ?? f.tipojogador ?? 'escudo';
      f.ordem_album = f.ordemAlbum ?? f.ordem_album ?? null;
      continue;
    }

    const num = Number(f.numero);
    const isNum = Number.isFinite(num);

    if (!isNum) {
      // non-numeric (keep as-is but normalize fields)
      f.id = f.id ?? `${sigla}_${String(f.numero)}`;
      f.sigla = sigla;
      f.secao = f.secao ?? info.secao ?? null;
      f.pais = f.pais ?? info.pais ?? null;
      f.tipo = f.tipo ?? null;
      f.tipojogador = f.tipoJogador ?? f.tipojogador ?? null;
      f.ordem_album = f.ordemAlbum ?? f.ordem_album ?? null;
      continue;
    }

    // Numeric case
    if (seen.has(num)) {
      // duplicate detected — shift this item up by 1 and shift all following numeric items >= newNum
      const newNum = num + 1;
      f.numero = String(newNum);
      f.id = `${sigla}_${f.numero}`;
      f.sigla = sigla;
      f.secao = f.secao ?? info.secao ?? null;
      f.pais = f.pais ?? info.pais ?? null;
      f.tipo = f.tipo ?? null;
      f.tipojogador = f.tipoJogador ?? f.tipojogador ?? (isFotoOficial(f) ? 'foto_oficial' : null);
      f.ordem_album = f.ordemAlbum ?? f.ordem_album ?? (isNaN(f.ordemAlbum) ? null : f.ordemAlbum);

      // Shift subsequent numeric items where needed
      for (let j = i + 1; j < figurinhas.length; j++) {
        const g = figurinhas[j];
        if (isEscudo(g)) continue;
        const gn = Number(g.numero);
        if (Number.isFinite(gn) && gn >= newNum) {
          g.numero = String(gn + 1);
          g.id = `${sigla}_${g.numero}`;
          // increment ordem_album if present
          const ord = g.ordemAlbum ?? g.ordem_album;
          if (Number.isFinite(Number(ord))) g.ordem_album = Number(ord) + 1;
        }
      }

      // mark the new number as seen
      seen.add(newNum);
    } else {
      // first time seeing this number
      seen.add(num);
      f.id = f.id ?? `${sigla}_${String(f.numero)}`;
      f.sigla = sigla;
      f.secao = f.secao ?? info.secao ?? null;
      f.pais = f.pais ?? info.pais ?? null;
      f.tipo = f.tipo ?? null;
      f.tipojogador = f.tipoJogador ?? f.tipojogador ?? null;
      f.ordem_album = f.ordemAlbum ?? f.ordem_album ?? (Number.isFinite(num) ? num : null);
    }
  }

  // Push normalized items preserving order
  for (const f of figurinhas) {
    results.push({
      id: f.id,
      secao: f.secao ?? info.secao ?? null,
      pais: f.pais ?? info.pais ?? null,
      sigla: f.sigla ?? sigla,
      numero: f.numero,
      tipo: f.tipo ?? null,
      jogador: f.jogador ?? null,
      tipojogador: f.tipojogador ?? f.tipoJogador ?? null,
      ordem_album: f.ordem_album ?? null
    });
  }
}

fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
console.log('Wrote', outPath, 'with', results.length, 'items');
