import vine from '@vinejs/vine'

const pixConfigSchema = vine.object({
  dadKey: vine.string().trim().maxLength(200).optional(),
  momKey: vine.string().trim().maxLength(200).optional(),
})

export const eventConfigValidator = vine.create({
  name: vine.string().trim().minLength(3).maxLength(200).optional(),
  date: vine.string().trim().maxLength(40).optional(),
  venueAddress: vine.string().trim().minLength(5).maxLength(500).optional(),
  deliveryAddress: vine.string().trim().maxLength(500).optional(),
  deliveryAddress2: vine.string().trim().maxLength(500).optional(),
  deliveryAddress3: vine.string().trim().maxLength(500).optional(),
  mapsLink: vine.string().trim().maxLength(2000).optional(),
  coverImageUrl: vine.string().trim().maxLength(2000).optional(),
  eventDetail: vine.string().trim().maxLength(5000).optional(),
  pix: pixConfigSchema.optional(),
})
