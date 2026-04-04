import { test } from '@japa/runner'

import { EventFetchFailedException, EventNotFoundException } from '#exceptions/domain_exceptions'
import { EventService } from '#services/event_service'

test.group('EventService', () => {
  test('maps entity to stable public DTO', async ({ assert }) => {
    const service = new EventService({
      findLatestPublicEvent: async () => ({
        id: 1,
        name: 'Cha da Helena',
        date: new Date('2026-06-18T15:00:00.000Z'),
        venueAddress: 'Rua Exemplo, 123 - Sao Paulo/SP',
        deliveryAddress: 'Rua Entrega, 456 - Sao Paulo/SP',
        mapsLink: 'https://maps.google.com/test',
        coverImageUrl: 'https://cdn.example.com/capa.jpg',
        pixKeyDad: 'dad@example.com',
        pixKeyMom: 'mom@example.com',
        pixQrcodeDad: null,
        pixQrcodeMom: null,
      }),
    } as any)

    const response = await service.getPublicEvent()

    assert.deepEqual(response, {
      data: {
        id: 1,
        name: 'Cha da Helena',
        date: '2026-06-18T15:00:00.000Z',
        venueAddress: 'Rua Exemplo, 123 - Sao Paulo/SP',
        deliveryAddress: 'Rua Entrega, 456 - Sao Paulo/SP',
        mapsLink: 'https://maps.google.com/test',
        coverImageUrl: 'https://cdn.example.com/capa.jpg',
        pix: {
          dadKey: 'dad@example.com',
          momKey: 'mom@example.com',
          dadQrCode: null,
          momQrCode: null,
        },
      },
      meta: {
        source: 'database',
      },
    })
    assert.notProperty(response.data as Record<string, unknown>, 'createdAt')
    assert.notProperty(response.data as Record<string, unknown>, 'updatedAt')
  })

  test('throws EVENT_NOT_FOUND when no event exists', async ({ assert }) => {
    const service = new EventService({ findLatestPublicEvent: async () => null } as any)

    try {
      await service.getPublicEvent()
      assert.fail('Expected EventNotFoundException to be thrown')
    } catch (error) {
      assert.instanceOf(error, EventNotFoundException)
      assert.equal((error as EventNotFoundException).errors[0]?.code, 'EVENT_NOT_FOUND')
    }
  })

  test('throws EVENT_FETCH_FAILED when repository fails', async ({ assert }) => {
    const service = new EventService({
      findLatestPublicEvent: async () => {
        throw new Error('db down')
      },
    } as any)

    try {
      await service.getPublicEvent()
      assert.fail('Expected EventFetchFailedException to be thrown')
    } catch (error) {
      assert.instanceOf(error, EventFetchFailedException)
      assert.equal((error as EventFetchFailedException).errors[0]?.code, 'EVENT_FETCH_FAILED')
    }
  })
})
