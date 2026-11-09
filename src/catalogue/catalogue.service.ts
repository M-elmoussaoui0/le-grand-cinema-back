import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { aujourdhui } from '../common/temps';
import { DisponibiliteService } from './disponibilite.service';
import { RechercheSeancesDto } from './dto/recherche-seances.dto';
import { Film } from './film.entity';
import { Seance } from './seance.entity';

@Injectable()
export class CatalogueService {
  constructor(
    @InjectRepository(Film) private readonly films: Repository<Film>,
    @InjectRepository(Seance) private readonly seances: Repository<Seance>,
    private readonly disponibilite: DisponibiliteService,
  ) {}

  listerFilms() {
    return this.films.find({ order: { titre: 'ASC' } });
  }

  /** Séances d'un jour, consultables sans compte (US1), avec les places restantes (US2). */
  async rechercherSeances(filtres: RechercheSeancesDto) {
    const jour = filtres.date ?? aujourdhui();
    const requete = this.seances
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.film', 'film')
      .innerJoinAndSelect('s.salle', 'salle')
      .where('s.debut >= :jour::date AND s.debut < :jour::date + 1', { jour })
      .orderBy('s.debut', 'ASC')
      .addOrderBy('salle.id', 'ASC');
    if (filtres.filmId) requete.andWhere('s.film_id = :filmId', { filmId: filtres.filmId });
    if (filtres.langue) requete.andWhere('s.langue = :langue', { langue: filtres.langue });
    const seances = await requete.getMany();
    return this.avecPlacesRestantes(seances);
  }

  async seance(id: number) {
    const seance = await this.seances.findOne({
      where: { id },
      relations: { film: true, salle: true },
    });
    if (!seance) throw new NotFoundException('Séance introuvable.');
    const [resultat] = await this.avecPlacesRestantes([seance]);
    return resultat;
  }

  private async avecPlacesRestantes(seances: Seance[]) {
    const places = await this.disponibilite.placesRestantes(seances.map((s) => s.id));
    return seances.map((s) => ({ ...s, placesRestantes: places.get(s.id) }));
  }
}
