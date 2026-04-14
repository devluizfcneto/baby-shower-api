import vine from '@vinejs/vine'

export const adminEventIdParamValidator = vine.create({
  eventId: vine
    .string()
    .trim()
    .regex(/^\d+$/)
    .transform((value) => Number(value)),
})
