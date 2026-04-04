import { ErrorCode } from '#constants/error_code'

import type { AppErrorItem } from './app_exception.js'
import { UnprocessableEntityException } from './http_exceptions.js'

type ValidationErrorInput = {
  message: string
  code?: string
  field?: string
  meta?: Record<string, unknown>
}

export function validationError(errors: ValidationErrorInput[]): UnprocessableEntityException {
  const normalized: AppErrorItem[] = errors.map((error) => ({
    message: error.message,
    code: error.code ?? ErrorCode.UNPROCESSABLE_ENTITY,
    field: error.field,
    meta: error.meta,
  }))

  return new UnprocessableEntityException(normalized)
}

export function requiredFieldsValidationError(
  fields: string[],
  message = 'Required fields are missing',
  code: string = ErrorCode.UNPROCESSABLE_ENTITY
): UnprocessableEntityException {
  return validationError([
    {
      code,
      message,
      field: fields.join('|'),
      meta: {
        fields,
      },
    },
  ])
}
