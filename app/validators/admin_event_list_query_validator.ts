import vine from '@vinejs/vine'

const positiveInteger = vine
  .string()
  .trim()
  .regex(/^\d+$/)
  .transform((value) => Number(value))

export const adminEventListQueryValidator = vine.create({
  page: positiveInteger.optional(),
  perPage: positiveInteger.optional(),
  status: vine.enum(['active', 'archived']).optional(),
  search: vine.string().trim().maxLength(120).optional(),
})
