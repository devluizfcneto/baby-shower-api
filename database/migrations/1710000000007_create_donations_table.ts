import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateDonationsTable1710000000007 implements MigrationInterface {
  name = 'CreateDonationsTable1710000000007'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id SERIAL PRIMARY KEY,
        event_id INT NOT NULL,
        donor_name VARCHAR(200) NULL,
        donor_email VARCHAR(200) NULL,
        amount DECIMAL(10, 2) NULL,
        pix_destination VARCHAR(10) NULL,
        donated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_donations_event_id
          FOREIGN KEY (event_id)
          REFERENCES events(id)
          ON DELETE CASCADE,
        CONSTRAINT chk_donations_amount_positive
          CHECK (amount IS NULL OR amount > 0),
        CONSTRAINT chk_donations_pix_destination
          CHECK (pix_destination IS NULL OR pix_destination IN ('dad', 'mom'))
      )
    `)

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_donations_donated_at_desc ON donations (donated_at DESC)'
    )
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_donations_pix_destination ON donations (pix_destination)'
    )
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_donations_donor_email_lower ON donations (LOWER(donor_email))'
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_donations_donor_email_lower')
    await queryRunner.query('DROP INDEX IF EXISTS idx_donations_pix_destination')
    await queryRunner.query('DROP INDEX IF EXISTS idx_donations_donated_at_desc')
    await queryRunner.query('DROP TABLE IF EXISTS donations')
  }
}
