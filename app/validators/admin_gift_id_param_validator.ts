import vine from '@vinejs/vine'

export const adminGiftIdParamValidator = vine.create({
  id: vine
    .string()
    .trim()
    .regex(/^\d+$/)
    .transform((value) => Number(value)),
})
