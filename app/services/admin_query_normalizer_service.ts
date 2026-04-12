import { ErrorCode } from '#constants/error_code'
import { validationError } from '#exceptions/error_factory'

export class AdminQueryNormalizerService {
  normalizePositiveInt(value: number, field: string, min: number, max: number): number {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw validationError([
        {
          field,
          message: `${field} must be an integer between ${min} and ${max}`,
        },
      ])
    }

    return value
  }

  parseOptionalIsoDate(value: string | undefined, field: string): Date | undefined {
    if (!value) {
      return undefined
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      throw validationError([
        {
          field,
          message: `${field} must be a valid ISO datetime`,
        },
      ])
    }

    return parsed
  }

  assertDateRange(
    from: Date | undefined,
    to: Date | undefined,
    fromField: string,
    toField: string
  ): void {
    if (!from || !to || from <= to) {
      return
    }

    throw validationError([
      {
        code: ErrorCode.INVALID_QUERY_FILTER_RANGE,
        field: `${fromField}|${toField}`,
        message: `${fromField} must be less than or equal to ${toField}`,
      },
    ])
  }

  calculateTotalPages(total: number, perPage: number): number {
    if (total === 0) {
      return 0
    }

    return Math.ceil(total / perPage)
  }
}
