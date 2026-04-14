import vine from '@vinejs/vine'

const pixSchema = vine
  .object({
    dadKey: vine.string().trim().maxLength(200).optional(),
    momKey: vine.string().trim().maxLength(200).optional(),
    dadQrCode: vine.string().trim().maxLength(4000).optional(),
    momQrCode: vine.string().trim().maxLength(4000).optional(),
  })
  .optional()

export const adminEventUpdateValidator = vine.create({
  name: vine.string().trim().minLength(3).maxLength(200).optional(),
  date: vine.string().trim().maxLength(40).optional(),
  venueAddress: vine.string().trim().minLength(5).maxLength(500).optional(),
  deliveryAddress: vine.string().trim().maxLength(500).optional(),
  mapsLink: vine.string().trim().url().maxLength(2000).optional(),
  coverImageUrl: vine.string().trim().url().maxLength(2000).optional(),
  pix: pixSchema,
})
