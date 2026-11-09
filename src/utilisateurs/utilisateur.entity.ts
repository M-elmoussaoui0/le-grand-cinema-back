import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type Role = 'client' | 'admin';

@Entity('utilisateur')
export class Utilisateur {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nom: string;

  @Column()
  prenom: string;

  @Column({ unique: true })
  email: string;

  /** Hash bcrypt : le mot de passe en clair n'est jamais stocké ni renvoyé par l'API. */
  @Column({ name: 'mot_de_passe_hash', select: false })
  motDePasseHash: string;

  @Column({ type: 'varchar', default: 'client' })
  role: Role;

  @CreateDateColumn({ name: 'date_creation' })
  dateCreation: Date;
}
