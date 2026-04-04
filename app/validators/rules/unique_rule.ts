import vine from '@vinejs/vine'

import { ErrorCode } from '#constants/error_code'
import { validationError } from '#exceptions/error_factory'
import { InternalServerException } from '#exceptions/http_exceptions'
import { AppDataSource } from '#services/database_service'

type UniqueRuleOptions = {
  table: string
  column: string
}

const SAFE_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/

function assertSafeIdentifier(identifier: string, label: 'table' | 'column') {
  if (!SAFE_IDENTIFIER_REGEX.test(identifier)) {
    throw InternalServerException.single(
      'Invalid unique rule configuration',
      ErrorCode.INTERNAL_SERVER_ERROR,
      label
    )
  }
}

export const uniqueRule = vine.createRule<UniqueRuleOptions>(
  async (value, options, field) => {
    if (value === null || value === undefined || value === '') {
      return
    }

    assertSafeIdentifier(options.table, 'table')
    assertSafeIdentifier(options.column, 'column')

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }

    const rows = await AppDataSource.query(
      `SELECT 1 FROM "${options.table}" WHERE "${options.column}" = $1 LIMIT 1`,
      [value]
    )

    if (rows.length > 0) {
      throw validationError([
        {
          code: ErrorCode.UNPROCESSABLE_ENTITY,
          field: String(field.name),
          message: `The ${String(field.name)} has already been taken`,
          meta: {
            rule: 'unique',
            table: options.table,
            column: options.column,
          },
        },
      ])
    }
  },
  {
    name: 'unique',
    isAsync: true,
  }
)
