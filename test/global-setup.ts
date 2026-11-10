/**
 * Fuseau horaire du cinéma pour les tests d'intégration.
 * Il doit être fixé ici, dans le processus principal de Jest : une modification faite
 * dans un fichier setupFiles reste dans le bac à sable du test et ne change pas l'heure de Node.
 * La CI tourne volontairement en UTC, comme les serveurs de production.
 */
export default function globalSetup() {
  process.env.TZ = 'Europe/Paris';
}
