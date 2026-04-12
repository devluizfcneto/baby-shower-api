import type { MigrationInterface, QueryRunner } from 'typeorm'

export class OptimizeAdminDonationAccess1710000000013 implements MigrationInterface {
  name = 'OptimizeAdminDonationAccess1710000000013'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_donations_event_donated_at ON donations (event_id, donated_at DESC)'
    )

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_donations_event_pix_destination_donated_at ON donations (event_id, pix_destination, donated_at DESC)'
    )

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_donations_donor_email ON donations (donor_email)'
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_donations_donor_email')
    await queryRunner.query('DROP INDEX IF EXISTS idx_donations_event_pix_destination_donated_at')
    await queryRunner.query('DROP INDEX IF EXISTS idx_donations_event_donated_at')
  }
}
