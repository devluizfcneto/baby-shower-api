import { test } from '@japa/runner'

import { Donation } from '#entities/donation'
import { Event } from '#entities/event'
import { AppDataSource } from '#services/database_service'

test.group('POST /api/donations', (group) => {
  group.setup(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }
  })

  group.each.setup(async () => {
    await AppDataSource.query(
      'TRUNCATE TABLE donations, purchase_confirmations, companions, guests, gifts, events RESTART IDENTITY CASCADE'
    )
  })

  async function createEvent(code = 'donationeventcode123') {
    return AppDataSource.getRepository(Event).save({
      code,
      name: 'Cha da Helena',
      date: new Date('2026-06-18T15:00:00.000Z'),
      venueAddress: 'Rua Exemplo, 123 - Sao Paulo/SP',
      deliveryAddress: null,
      mapsLink: null,
      coverImageUrl: null,
      pixKeyDad: null,
      pixKeyMom: null,
      pixQrcodeDad: null,
      pixQrcodeMom: null,
    })
  }

  test('returns 201 and persists donation with all fields', async ({ client, assert }) => {
    await createEvent()

    const response = await client.post('/api/donations').json({
      donorName: 'Maria Oliveira',
      donorEmail: 'MARIA@EMAIL.COM',
      amount: 150,
      pixDestination: 'mom',
    })

    response.assertStatus(201)
    response.assertBodyContains({
      data: {
        donorName: 'Maria Oliveira',
        donorEmail: 'maria@email.com',
        amount: 150,
        pixDestination: 'mom',
      },
    })

    const saved = await AppDataSource.getRepository(Donation).findOne({
      where: { donorEmail: 'maria@email.com' },
    })

    assert.isNotNull(saved)
    assert.equal(saved?.donorName, 'Maria Oliveira')
    assert.equal(saved?.pixDestination, 'mom')
  })

  test('returns 201 and persists donation with partial payload', async ({ client, assert }) => {
    await createEvent()

    const response = await client.post('/api/donations').json({
      amount: 79.9,
    })

    response.assertStatus(201)
    response.assertBodyContains({
      data: {
        donorName: null,
        donorEmail: null,
        amount: 79.9,
        pixDestination: null,
      },
    })

    const all = await AppDataSource.getRepository(Donation).find()
    assert.equal(all.length, 1)
  })

  test('returns 422 when payload is semantically empty', async ({ client }) => {
    await createEvent()

    const response = await client.post('/api/donations').json({})

    response.assertStatus(422)
    response.assertBodyContains({
      errors: [
        {
          code: 'UNPROCESSABLE_ENTITY',
        },
      ],
    })
  })

  test('returns 422 when email is invalid', async ({ client }) => {
    await createEvent()

    const response = await client.post('/api/donations').json({
      donorEmail: 'invalid-email',
    })

    response.assertStatus(422)
  })

  test('returns 422 when amount is lower than minimum', async ({ client }) => {
    await createEvent()

    const response = await client.post('/api/donations').json({
      amount: 0,
    })

    response.assertStatus(422)
  })

  test('returns 404 when no event exists to attach donation', async ({ client }) => {
    const response = await client.post('/api/donations').json({
      donorName: 'Convidado sem evento',
    })

    response.assertStatus(404)
    response.assertBodyContains({
      errors: [
        {
          code: 'DONATION_EVENT_UNAVAILABLE',
        },
      ],
    })
  })
})
