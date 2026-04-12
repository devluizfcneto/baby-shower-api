import vine from '@vinejs/vine'

const positiveInteger = vine
  .string()
  .trim()
  .regex(/^\d+$/)
  .transform((value) => Number(value))

export const adminDonationListQueryValidator = vine.create({
  page: positiveInteger.optional(),
  perPage: positiveInteger.optional(),
  search: vine.string().trim().maxLength(120).optional(),
  pixDestination: vine.enum(['dad', 'mom']).optional(),
  donatedFrom: vine.string().trim().maxLength(40).optional(),
  donatedTo: vine.string().trim().maxLength(40).optional(),
  sortBy: vine.enum(['donatedAt', 'donorName', 'amount', 'pixDestination']).optional(),
  sortDir: vine.enum(['asc', 'desc']).optional(),
})
