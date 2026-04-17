import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateEventsTable1710000000000 implements MigrationInterface {
  name = 'CreateEventsTable1710000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        code VARCHAR(20) NOT NULL UNIQUE DEFAULT SUBSTRING(MD5(RANDOM()::text), 1, 20),
        date TIMESTAMP NOT NULL,
        venue_address TEXT NOT NULL,
        delivery_address TEXT NULL,
        delivery_address_2 TEXT NULL,
        delivery_address_3 TEXT NULL,
        maps_link TEXT NULL,
        cover_image_url TEXT NULL,
        event_detail TEXT NULL,
        pix_key_dad VARCHAR(200) NULL,
        pix_key_mom VARCHAR(200) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)

    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_events_date_desc ON events (date DESC)')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_events_date_desc')
    await queryRunner.query('DROP TABLE IF EXISTS events')
  }
}
