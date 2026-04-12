import type { MigrationInterface, QueryRunner } from 'typeorm'

export class OptimizeAdminPurchaseConfirmationAccess1710000000012 implements MigrationInterface {
  name = 'OptimizeAdminPurchaseConfirmationAccess1710000000012'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_purchase_confirmations_confirmed_at ON purchase_confirmations (confirmed_at DESC)'
    )

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_purchase_confirmations_gift_confirmed_at ON purchase_confirmations (gift_id, confirmed_at DESC)'
    )

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_purchase_confirmations_guest_email ON purchase_confirmations (guest_email)'
    )

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_gifts_event_marketplace ON gifts (event_id, marketplace)'
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_gifts_event_marketplace')
    await queryRunner.query('DROP INDEX IF EXISTS idx_purchase_confirmations_guest_email')
    await queryRunner.query('DROP INDEX IF EXISTS idx_purchase_confirmations_gift_confirmed_at')
    await queryRunner.query('DROP INDEX IF EXISTS idx_purchase_confirmations_confirmed_at')
  }
}
