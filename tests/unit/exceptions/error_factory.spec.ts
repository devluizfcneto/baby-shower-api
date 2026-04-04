import { test } from '@japa/runner'

import { ErrorCode } from '#constants/error_code'
import { requiredFieldsValidationError, validationError } from '#exceptions/error_factory'

test.group('ErrorFactory', () => {
  test('builds unprocessable entity exception with multiple field errors', ({ assert }) => {
    const exception = validationError([
      { field: 'email', message: 'Invalid email format' },
      {
        field: 'password',
        message: 'Password must have at least 8 characters',
        code: ErrorCode.UNPROCESSABLE_ENTITY,
      },
    ])

    assert.equal(exception.status, 422)
    assert.lengthOf(exception.errors, 2)
    assert.deepInclude(exception.errors[0], {
      code: ErrorCode.UNPROCESSABLE_ENTITY,
      field: 'email',
      message: 'Invalid email format',
    })
  })

  test('builds required fields error helper with stable code and field list', ({ assert }) => {
    const exception = requiredFieldsValidationError(
      ['name', 'email', 'password'],
      'name, email and password are required',
      ErrorCode.AUTH_REQUIRED_FIELDS
    )

    assert.equal(exception.status, 422)
    assert.deepEqual(exception.errors, [
      {
        code: ErrorCode.AUTH_REQUIRED_FIELDS,
        field: 'name|email|password',
        message: 'name, email and password are required',
        meta: {
          fields: ['name', 'email', 'password'],
        },
      },
    ])
  })
})
