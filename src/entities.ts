import 'reflect-metadata';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('feeds')
export class Feed {
	@PrimaryGeneratedColumn({ type: "int", unsigned: true })
	id: number;

	@Column({ type: 'varchar' })
	title: string;

	@Column({ type: 'varchar' })
	downloadId: string;

	@Column({ type: 'varchar', unique: true })
	hash: string;

	@Column({ type: 'varchar' })
	link: string;

	@CreateDateColumn({ type: 'datetime', default: () => `datetime(\'now\', \'localtime\')` })
	addAt: string;

	@Column({ type: 'boolean', default: false })
	downloaded: boolean;

	@Column({ type: 'datetime', nullable: true })
	downloadAt: string;
}