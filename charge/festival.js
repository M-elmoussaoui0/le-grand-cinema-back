/**
 * Test de charge – US15 « Tenir la charge du festival ».
 * Simule des spectateurs qui consultent la programmation et le plan des salles en même temps.
 * Usage : npm run charge -- http://localhost:3000   (API démarrée)
 */
const autocannon = require('autocannon');

const url = process.argv[2] ?? 'http://localhost:3000';
const connexions = Number(process.env.CONNEXIONS ?? 200);
const duree = Number(process.env.DUREE ?? 20);

async function scenario(titre, chemin) {
  const r = await autocannon({ url: `${url}${chemin}`, connections: connexions, duration: duree });
  const erreurs = r.errors + r.timeouts + r.non2xx;
  console.log(
    `${titre.padEnd(28)} ${String(Math.round(r.requests.average)).padStart(6)} req/s | ` +
      `latence moy. ${r.latency.average} ms | p99 ${r.latency.p99} ms | erreurs ${erreurs}`,
  );
  return erreurs;
}

(async () => {
  console.log(`${connexions} utilisateurs simultanés pendant ${duree} s sur ${url}\n`);
  let erreurs = 0;
  erreurs += await scenario('Programmation du jour', '/api/seances');
  erreurs += await scenario('Plan de salle (300 places)', '/api/seances/1/plan');
  process.exit(erreurs > 0 ? 1 : 0);
})();
