import { ErrorCode } from '#constants/error_code'

import type { AppErrorItem, AppErrorResponse } from './app_exception.js'

type VineLikeMessage = {
  message?: string
  field?: string
  rule?: string
  [key: string]: unknown
}

type HttpErrorLike = Error & {
  status?: number
  code?: string
  messages?: VineLikeMessage[] | { errors?: VineLikeMessage[] }
}

function statusCodeToAppCode(status: number): string {
  if (status === 400) return ErrorCode.BAD_REQUEST
  if (status === 401) return ErrorCode.UNAUTHORIZED
  if (status === 403) return ErrorCode.FORBIDDEN
  if (status === 404) return ErrorCode.NOT_FOUND
  if (status === 409) return ErrorCode.CONFLICT
  if (status === 422) return ErrorCode.UNPROCESSABLE_ENTITY
  return ErrorCode.INTERNAL_SERVER_ERROR
}

export function mapValidationMessages(messages: VineLikeMessage[] | undefined): AppErrorItem[] {
  if (!messages || messages.length === 0) {
    return [
      {
        code: ErrorCode.UNPROCESSABLE_ENTITY,
        message: 'Validation failed',
      },
    ]
  }

  return messages.map((message) => ({
    code: ErrorCode.UNPROCESSABLE_ENTITY,
    message: message.message ?? 'Invalid value',
    field: message.field,
    meta: {
      rule: message.rule,
      raw: message,
    },
  }))
}

function normalizeValidationMessages(
  messages: HttpErrorLike['messages']
): VineLikeMessage[] | undefined {
  if (!messages) {
    return undefined
  }

  if (Array.isArray(messages)) {
    return messages
  }

  if (Array.isArray(messages.errors)) {
    return messages.errors
  }

  return undefined
}

export function mapUnknownErrorToAppResponse(
  error: unknown,
  debugEnabled: boolean
): { status: number; payload: AppErrorResponse } {
  const fallback = {
    status: 500,
    payload: {
      errors: [
        {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Unexpected server error',
        },
      ],
    } satisfies AppErrorResponse,
  }

  if (!(error instanceof Error)) {
    return fallback
  }

  const httpError = error as HttpErrorLike

  if (httpError.code === 'E_VALIDATION_ERROR') {
    return {
      status: 422,
      payload: {
        errors: mapValidationMessages(normalizeValidationMessages(httpError.messages)),
      },
    }
  }

  if (typeof httpError.status === 'number') {
    const status = httpError.status >= 400 ? httpError.status : 500
    const isServerError = status >= 500

    return {
      status,
      payload: {
        errors: [
          {
            code: statusCodeToAppCode(status),
            message: isServerError && !debugEnabled ? 'Unexpected server error' : httpError.message,
          },
        ],
      },
    }
  }

  if (debugEnabled) {
    return {
      status: 500,
      payload: {
        errors: [
          {
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            message: error.message,
          },
        ],
      },
    }
  }

  return fallback
}
