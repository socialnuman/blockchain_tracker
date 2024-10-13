import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Price {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  chain: string; // 'ethereum' or 'polygon'

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @CreateDateColumn({ type: 'timestamp' })
  timestamp: Date;
}

@Entity()
export class AlertSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  dollar: number;

  @Column()
  chain: string;

  @Column()
  email: string;

  @CreateDateColumn({ type: 'timestamp' })
  timestamp: Date;
}
