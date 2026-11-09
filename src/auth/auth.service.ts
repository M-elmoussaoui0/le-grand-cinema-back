import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Utilisateur } from '../utilisateurs/utilisateur.entity';
import { ConnexionDto } from './dto/connexion.dto';
import { InscriptionDto } from './dto/inscription.dto';

/** Coût bcrypt : 2^10 tours de calcul, lent pour un attaquant, imperceptible pour l'utilisateur. */
export const BCRYPT_COST = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Utilisateur) private readonly utilisateurs: Repository<Utilisateur>,
    private readonly jwt: JwtService,
  ) {}

  async inscrire(dto: InscriptionDto) {
    const email = dto.email.toLowerCase().trim();
    if (await this.utilisateurs.exists({ where: { email } })) {
      throw new ConflictException('Un compte existe déjà avec cette adresse e-mail.');
    }
    const utilisateur = await this.utilisateurs.save(
      this.utilisateurs.create({
        nom: dto.nom.trim(),
        prenom: dto.prenom.trim(),
        email,
        motDePasseHash: await bcrypt.hash(dto.motDePasse, BCRYPT_COST),
        role: 'client',
      }),
    );
    return this.genererJeton(utilisateur);
  }

  async connecter(dto: ConnexionDto) {
    const utilisateur = await this.utilisateurs
      .createQueryBuilder('u')
      .addSelect('u.motDePasseHash')
      .where('u.email = :email', { email: dto.email.toLowerCase().trim() })
      .getOne();
    // Même message d'erreur que l'e-mail existe ou non : on ne révèle pas les comptes existants
    if (!utilisateur || !(await bcrypt.compare(dto.motDePasse, utilisateur.motDePasseHash))) {
      throw new UnauthorizedException('E-mail ou mot de passe incorrect.');
    }
    return this.genererJeton(utilisateur);
  }

  async profil(id: number) {
    const utilisateur = await this.utilisateurs.findOne({ where: { id } });
    if (!utilisateur) throw new NotFoundException('Compte introuvable.');
    return utilisateur;
  }

  /**
   * Droit à l'effacement (RGPD) : les données personnelles sont anonymisées.
   * Les réservations sont conservées, sans lien avec une personne identifiable, pour la comptabilité.
   */
  async supprimerCompte(id: number) {
    await this.profil(id);
    await this.utilisateurs.update(id, {
      nom: 'Supprimé',
      prenom: 'Compte',
      email: `supprime-${id}@anonyme.invalid`,
      motDePasseHash: await bcrypt.hash(crypto.randomUUID(), BCRYPT_COST),
    });
    return { message: 'Votre compte et vos données personnelles ont été supprimés.' };
  }

  private genererJeton(u: Utilisateur) {
    return {
      accessToken: this.jwt.sign({ sub: u.id, email: u.email, role: u.role }),
      utilisateur: { id: u.id, nom: u.nom, prenom: u.prenom, email: u.email, role: u.role },
    };
  }
}
