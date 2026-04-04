import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateGuestsTable1710000000003 implements MigrationInterface {
  name = 'CreateGuestsTable1710000000003'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guests (
        id SERIAL PRIMARY KEY,
        event_id INT NOT NULL,
        full_name VARCHAR(200) NOT NULL,
        email VARCHAR(200) NOT NULL,
        confirmed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_guests_event_id
          FOREIGN KEY (event_id)
          REFERENCES events(id)
          ON DELETE CASCADE,
        CONSTRAINT uq_guests_event_email UNIQUE (event_id, email)
      )
    `)

    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_guests_email ON guests (email)')
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_guests_confirmed_at_desc ON guests (confirmed_at DESC)'
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_guests_confirmed_at_desc')
    await queryRunner.query('DROP INDEX IF EXISTS idx_guests_email')
    await queryRunner.query('DROP TABLE IF EXISTS guests')
  }
}
