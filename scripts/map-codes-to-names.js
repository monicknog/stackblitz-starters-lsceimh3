const fs = require('fs');
const catalog = JSON.parse(fs.readFileSync('src/figurinhas-album.json','utf8'));
const list = 'QAT 5, USA 18, USA 19, BRA 10, BEL 10, BEL 14, BEL 17, IRN 2, IRN 6, IRN 10, AUS 2, CZE 4, CZE 6, CZE 8, CZE 10, CZE 17, CZE 19, RSA 6, RSA 18, RSA 19, IRQ 4, IRQ 9, IRQ 20, ARG 5, CRO 5, CPV 15, CPV 19, SUI 11, SUI 12, SUI 19, CRO 9, NED 5, NED 9, GER 11, KOR 4, URU 4, URU 7, URU 8, URU 16, GHA 5, TUR 2, TUR 4, TUR 6, TUR 8, TUR 10, TUR 12, TUR 15, TUR 17, TUN 2, TUN 4, TUN 8, TUN 19, JPN 10, JPN 15, JPN 19, FRA 2, FRA 5, FRA 15, FRA 19, SWE 4, SWE 5, SWE 19, CIV 5, CIV 9, EGY 2'.replace(/\./g,'');
const codes = list.split(',').map(s=>s.trim()).filter(Boolean);
const byId = new Map(catalog.map(x => [x.id, x]));
for (const code of codes) {
  const id = code.replace(/\s+/g,'_');
  const item = byId.get(id);
  console.log(code + ' → ' + (item && item.jogador ? item.jogador : '[NÃO ENCONTRADO]'));
}
