import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateCompanionsTable1710000000004 implements MigrationInterface {
  name = 'CreateCompanionsTable1710000000004'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS companions (
        id SERIAL PRIMARY KEY,
        guest_id INT NOT NULL,
        event_id INT NOT NULL,
        full_name VARCHAR(200) NOT NULL,
        email VARCHAR(200) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_companions_guest_id
          FOREIGN KEY (guest_id)
          REFERENCES guests(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_companions_event_id
          FOREIGN KEY (event_id)
          REFERENCES events(id)
          ON DELETE CASCADE
      )
    `)

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_companions_guest_id ON companions (guest_id)'
    )
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_companions_event_id ON companions (event_id)'
    )
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_companions_email_lower ON companions (LOWER(email))'
    )
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_companions_event_email_lower
      ON companions (event_id, LOWER(email))
      WHERE email IS NOT NULL
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS uq_companions_event_email_lower')
    await queryRunner.query('DROP INDEX IF EXISTS idx_companions_email_lower')
    await queryRunner.query('DROP INDEX IF EXISTS idx_companions_event_id')
    await queryRunner.query('DROP INDEX IF EXISTS idx_companions_guest_id')
    await queryRunner.query('DROP TABLE IF EXISTS companions')
  }
}
