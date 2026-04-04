import { test } from '@japa/runner'

import { ErrorCode } from '#constants/error_code'
import { mapUnknownErrorToAppResponse, mapValidationMessages } from '#exceptions/error_mapper'

test.group('ErrorMapper', () => {
  test('maps Vine-like validation messages to AppErrorItem[]', ({ assert }) => {
    const mapped = mapValidationMessages([
      {
        field: 'email',
        message: 'The email field must be a valid email address',
        rule: 'email',
      },
      {
        field: 'password',
        message: 'The password field must have at least 8 characters',
        rule: 'minLength',
      },
    ])

    assert.lengthOf(mapped, 2)
    assert.deepInclude(mapped[0], {
      code: ErrorCode.UNPROCESSABLE_ENTITY,
      field: 'email',
      message: 'The email field must be a valid email address',
    })
    assert.equal(mapped[1].meta?.rule, 'minLength')
  })

  test('maps E_VALIDATION_ERROR into 422 with errors[] payload', ({ assert }) => {
    const mapped = mapUnknownErrorToAppResponse(
      Object.assign(new Error('Validation failed'), {
        code: 'E_VALIDATION_ERROR',
        messages: [{ field: 'name', message: 'The name field is required', rule: 'required' }],
      }),
      false
    )

    assert.equal(mapped.status, 422)
    assert.deepEqual(mapped.payload, {
      errors: [
        {
          code: ErrorCode.UNPROCESSABLE_ENTITY,
          field: 'name',
          message: 'The name field is required',
          meta: {
            rule: 'required',
            raw: {
              field: 'name',
              message: 'The name field is required',
              rule: 'required',
            },
          },
        },
      ],
    })
  })

  test('maps generic http error status into stable app code', ({ assert }) => {
    const mapped = mapUnknownErrorToAppResponse(
      Object.assign(new Error('missing token'), { status: 401 }),
      true
    )

    assert.equal(mapped.status, 401)
    assert.deepEqual(mapped.payload, {
      errors: [
        {
          code: ErrorCode.UNAUTHORIZED,
          message: 'missing token',
        },
      ],
    })
  })
})
