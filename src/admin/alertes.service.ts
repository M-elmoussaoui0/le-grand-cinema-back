import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MAINTENANT_SQL } from '../common/temps';
import { LigneStats, STATS_SEANCE_SQL, taux } from './statistiques.service';

export interface Alerte {
  type: 'presque_complet' | 'complet' | 'pic_ventes';
  niveau: 'attention' | 'critique';
  seanceId: number;
  film: string;
  salle: string;
  debut: Date;
  message: string;
}

/** Seuils réglables par variables d'environnement, sans modifier le code. */
export const seuils = () => ({
  remplissage: Number(process.env.ALERTE_SEUIL_REMPLISSAGE ?? 90),
  ventesParHeure: Number(process.env.ALERTE_PIC_VENTES_HEURE ?? 50),
});

@Injectable()
export class AlertesService {
  constructor(private readonly db: DataSource) {}

  /**
   * Alertes des séances en cours ou dans les 48 prochaines heures (US12) :
   * séance presque complète, complète, ou pic de ventes sur la dernière heure.
   * Le tableau de bord les interroge toutes les 30 secondes.
   */
  async alertes(): Promise<Alerte[]> {
    const lignes: LigneStats[] = await this.db.query(
      `${STATS_SEANCE_SQL}
       WHERE se.fin > ${MAINTENANT_SQL} AND se.debut < ${MAINTENANT_SQL} + interval '48 hours'
       GROUP BY se.id, f.titre, sa.nom, sa.capacite
       ORDER BY se.debut`,
    );
    return this.detecter(lignes);
  }

  detecter(lignes: LigneStats[]): Alerte[] {
    const { remplissage, ventesParHeure } = seuils();
    const alertes: Alerte[] = [];
    for (const l of lignes) {
      const base = { seanceId: l.seance_id, film: l.film, salle: l.salle, debut: l.debut };
      const t = taux(l.en_ligne + l.guichet, l.capacite);
      if (t >= 100) {
        alertes.push({
          ...base,
          type: 'complet',
          niveau: 'critique',
          message: `${l.film} (${l.salle}) est complet.`,
        });
      } else if (t >= remplissage) {
        alertes.push({
          ...base,
          type: 'presque_complet',
          niveau: 'attention',
          message: `${l.film} (${l.salle}) est rempli à ${t} % : pensez à ouvrir une séance supplémentaire.`,
        });
      }
      if (l.derniere_heure >= ventesParHeure) {
        alertes.push({
          ...base,
          type: 'pic_ventes',
          niveau: 'critique',
          message: `Pic de ventes : ${l.derniere_heure} places vendues en une heure pour ${l.film} (${l.salle}).`,
        });
      }
    }
    return alertes.sort((a, b) => (a.niveau === b.niveau ? 0 : a.niveau === 'critique' ? -1 : 1));
  }
}
