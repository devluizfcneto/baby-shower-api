import vine from '@vinejs/vine'

export const giftIdParamValidator = vine.create({
  giftId: vine
    .string()
    .trim()
    .regex(/^\d+$/)
    .transform((value) => Number(value)),
})
