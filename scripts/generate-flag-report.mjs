import fs from 'fs';
import path from 'path';

const albumPath = path.join(process.cwd(), 'src', 'figurinhas-album.json');
const mapPath = path.join(process.cwd(), 'src', 'iso3-to-iso2.json');
const outJson = path.join(process.cwd(), 'scripts', 'flag-report.json');
const outTxt = path.join(process.cwd(), 'scripts', 'flag-report.txt');

if (!fs.existsSync(albumPath)) throw new Error('album file missing');
if (!fs.existsSync(mapPath)) throw new Error('map file missing');

const album = JSON.parse(fs.readFileSync(albumPath, 'utf8'));
const iso3 = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const iso2ToSigs = {};
for (const [k, v] of Object.entries(iso3)) {
  iso2ToSigs[v] = iso2ToSigs[v] || [];
  iso2ToSigs[v].push(k);
}

const items = album.map((f) => {
  const sigla = f.sigla || null;
  const pais = f.pais || null;
  const mapped = sigla && iso3[sigla] ? iso3[sigla] : null;
  const initial = mapped
    ? mapped.startsWith('data:')
      ? mapped
      : `https://flagcdn.com/w20/${String(mapped).toLowerCase()}.png`
    : pais
    ? `https://countryflagsapi.com/png/${encodeURIComponent(pais)}`
    : null;

  return {
    id: f.id,
    sigla,
    pais,
    mappedIso2: mapped,
    initialFlagUrl: initial,
  };
});

const noMapping = items.filter((i) => !i.mappedIso2);
const mappedDuplicates = Object.entries(iso2ToSigs).filter(([, sigs]) => sigs.length > 1).map(([iso2, sigs]) => ({ iso2, sigs }));

const potentialProblems = items.filter((i) => !i.mappedIso2 || (i.mappedIso2 && mappedDuplicates.find(d => d.iso2 === i.mappedIso2)));

const report = {
  generatedAt: new Date().toISOString(),
  totalItems: items.length,
  uniqueSiglas: Array.from(new Set(album.map(a=>a.sigla).filter(Boolean))).length,
  noMappingCount: noMapping.length,
  mappedDuplicateIso2: mappedDuplicates,
  potentialProblemsCount: potentialProblems.length,
  items,
};

fs.writeFileSync(outJson, JSON.stringify(report, null, 2), 'utf8');

const lines = [];
lines.push(`Flag report generated at ${report.generatedAt}`);
lines.push(`Total items: ${report.totalItems}`);
lines.push(`Items without ISO2 mapping: ${report.noMappingCount}`);
lines.push('');
lines.push('Mappings that point to the same ISO2 (possible ambiguity):');
for (const d of mappedDuplicates) {
  lines.push(`  ${d.iso2}: ${d.sigs.join(', ')}`);
}
lines.push('');
lines.push('Items without mapping (sample up to 200):');
for (const i of noMapping.slice(0, 200)) {
  lines.push(`  ${i.id} | sigla=${i.sigla} | pais=${i.pais} | url=${i.initialFlagUrl}`);
}

fs.writeFileSync(outTxt, lines.join('\n'), 'utf8');
console.log('Wrote', outJson, outTxt);
