import vine from '@vinejs/vine'

const positiveInteger = vine
  .string()
  .trim()
  .regex(/^\d+$/)
  .transform((value) => Number(value))

export const adminGuestListQueryValidator = vine.create({
  page: positiveInteger.optional(),
  perPage: positiveInteger.optional(),
  search: vine.string().trim().maxLength(120).optional(),
  confirmedFrom: vine.string().trim().maxLength(40).optional(),
  confirmedTo: vine.string().trim().maxLength(40).optional(),
  sortBy: vine.enum(['confirmedAt', 'fullName', 'email']).optional(),
  sortDir: vine.enum(['asc', 'desc']).optional(),
  expand: vine.enum(['companions']).optional(),
})
