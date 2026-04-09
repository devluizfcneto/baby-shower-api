import vine from '@vinejs/vine'

export const donationValidator = vine.create({
  donorName: vine.string().trim().minLength(2).maxLength(200).optional(),
  donorEmail: vine.string().trim().email().maxLength(200).optional(),
  amount: vine.number().min(0.01).max(1000000).optional(),
  pixDestination: vine.enum(['dad', 'mom']).optional(),
})
