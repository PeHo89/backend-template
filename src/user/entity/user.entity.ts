import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { RefreshTokenEntity } from './refresh-token.entity';

@Entity({ name: 'user' })
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  username: string;

  @Column()
  email: string;

  @Exclude()
  @Column()
  passwordHash: string;

  @Exclude()
  @Column({ nullable: true })
  doubleOptInToken: string;

  @Exclude()
  @Column({ nullable: true })
  doubleOptInSentAt: Date;

  @Exclude()
  @Column({ nullable: true })
  doubleOptInConfirmedAt: Date;

  @Exclude()
  @Column({ nullable: true })
  resetPasswordToken: string;

  @Exclude()
  @Column({ nullable: true })
  resetPasswordSentAt: Date;

  @Exclude()
  @Column({ nullable: true })
  resetPasswordConfirmedAt: Date;

  @Exclude()
  @Column({ nullable: true, default: false })
  resetPasswordInProgress: boolean;

  @Exclude()
  @Column({ default: new Date() })
  registeredAt: Date;

  @Exclude()
  @Column({ default: true })
  active: boolean;

  @Exclude()
  @OneToMany(
    () => RefreshTokenEntity,
    refreshToken => refreshToken.user,
    { cascade: ['insert', 'update'], eager: true },
  )
  refreshToken: RefreshTokenEntity[];

  @Exclude()
  @CreateDateColumn()
  createdAt: Date;

  @Exclude()
  @UpdateDateColumn()
  updatedAt: Date;
}
