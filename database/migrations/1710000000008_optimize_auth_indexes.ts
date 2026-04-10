import type { MigrationInterface, QueryRunner } from 'typeorm'

export class OptimizeAuthIndexes1710000000008 implements MigrationInterface {
  name = 'OptimizeAuthIndexes1710000000008'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_email_lower ON users (LOWER(email))'
    )

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id_expires_at ON user_sessions (user_id, expires_at DESC)'
    )

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token_hash ON user_sessions (refresh_token_hash)'
    )

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked_at ON user_sessions (revoked_at)'
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_user_sessions_revoked_at')
    await queryRunner.query('DROP INDEX IF EXISTS idx_user_sessions_refresh_token_hash')
    await queryRunner.query('DROP INDEX IF EXISTS idx_user_sessions_user_id_expires_at')
    await queryRunner.query('DROP INDEX IF EXISTS uniq_users_email_lower')
  }
}
