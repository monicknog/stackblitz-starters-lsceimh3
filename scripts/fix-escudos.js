const fs = require('fs');
const path = 'src/figurinhas-com-jogadores.json';

function normalizeTeam(team) {
  const sigla = team.sigla;
  const figurinhas = team.figurinhas || [];

  const escudo = figurinhas.find(f => f.tipoJogador === 'escudo' || (f.numero && String(f.numero).toLowerCase() === 'escudo'));
  const foto = figurinhas.find(f => f.tipoJogador === 'foto_oficial' || (f.imagem && /team-photo|team_photo|photo/i.test(f.imagem)));
  const players = figurinhas.filter(f => f.tipoJogador === 'jogador').slice();

  players.sort((a, b) => {
    const oa = typeof a.ordemAlbum === 'number' ? a.ordemAlbum : (parseInt(a.numero) || 0);
    const ob = typeof b.ordemAlbum === 'number' ? b.ordemAlbum : (parseInt(b.numero) || 0);
    return oa - ob;
  });

  const primeiro = [];
  if (escudo) {
    escudo.numero = '1';
    escudo.id = `${sigla}_1`;
    primeiro.push(escudo);
  }

  const left = players.filter(p => (p.ordemAlbum || parseInt(p.numero) || 0) <= 11);
  const right = players.filter(p => (p.ordemAlbum || parseInt(p.numero) || 0) > 11);

  const ordered = [];
  // push escudo
  ordered.push(...primeiro);

  // push left players (2..11)
  for (let i = 0; i < left.length; i++) {
    const pos = 2 + i;
    const p = left[i];
    p.numero = String(pos);
    p.id = `${sigla}_${p.numero}`;
    ordered.push(p);
  }

  // foto -> 12
  if (foto) {
    foto.numero = '12';
    foto.id = `${sigla}_12`;
    ordered.push(foto);
  }

  // push right players (13..19)
  for (let i = 0; i < right.length; i++) {
    const pos = 13 + i;
    const p = right[i];
    p.numero = String(pos);
    p.id = `${sigla}_${p.numero}`;
    ordered.push(p);
  }

  // reserved 20
  const reserved = figurinhas.find(f => f.tipoJogador === 'reservado' || (f.numero && String(f.numero) === '20'));
  if (reserved) {
    reserved.numero = '20';
    reserved.id = `${sigla}_20`;
    ordered.push(reserved);
  } else {
    ordered.push({
      id: `${sigla}_20`,
      secao: team.secao || null,
      pais: team.pais || null,
      sigla,
      numero: '20',
      tipo: 'Jogador',
      jogador: null,
      tipoJogador: 'reservado',
      nota: 'Posição extra no modelo de dados; no álbum Panini os 18 jogadores vão de 1-11 e 13-19'
    });
  }

  team.figurinhas = ordered;
}

try {
  const raw = fs.readFileSync(path, 'utf8');
  const data = JSON.parse(raw);

  if (!data.times) {
    console.error('Formato inesperado: chave `times` não encontrada.');
    process.exit(1);
  }

  for (const sigla of Object.keys(data.times)) {
    normalizeTeam(data.times[sigla]);
  }
  // Rebuild lista_figurinhas: replace per-sigla blocks with normalized team.figurinhas
  if (Array.isArray(data.lista_figurinhas)) {
    const seen = {};
    const newLista = [];
    for (const item of data.lista_figurinhas) {
      if (item && item.sigla && data.times[item.sigla]) {
        const sig = item.sigla;
        if (!seen[sig]) {
          newLista.push(...data.times[sig].figurinhas);
          seen[sig] = true;
        }
        // else skip duplicate entries for this sigla
      } else {
        newLista.push(item);
      }
    }
    data.lista_figurinhas = newLista;
  }

  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
  console.log('Escudos corrigidos com sucesso — todos atribuídos a _1.');
} catch (err) {
  console.error('Erro ao processar arquivo:', err);
  process.exit(1);
}
