import { test } from '@japa/runner'

import { EventConfigNotFoundException } from '#exceptions/domain_exceptions'
import { EventConfigService } from '#services/event_config_service'
import { EventPayloadMapperService } from '#services/event_payload_mapper_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'

test.group('EventConfigService', () => {
  test('returns current event config payload', async ({ assert }) => {
    const service = new EventConfigService(
      {
        findCurrentConfig: async () => ({
          id: 1,
          code: 'babyshower2026event1',
          name: 'Cha da Helena',
          date: new Date('2026-06-18T15:00:00.000Z'),
          venueAddress: 'Rua Exemplo, 123 - Sao Paulo/SP',
          deliveryAddress: 'Rua Entrega, 456 - Sao Paulo/SP',
          mapsLink: 'https://maps.google.com/test',
          coverImageUrl: null,
          pixKeyDad: 'dad@example.com',
          pixKeyMom: null,
          pixQrcodeDad: null,
          pixQrcodeMom: null,
          updatedAt: new Date('2026-04-09T12:00:00.000Z'),
        }),
      } as any,
      new EventPayloadMapperService(),
      new InputSanitizerService()
    )

    const result = await service.getCurrentConfig()

    assert.equal(result.data.id, 1)
    assert.equal(result.data.code, 'babyshower2026event1')
    assert.equal(result.data.name, 'Cha da Helena')
  })

  test('throws EVENT_CONFIG_NOT_FOUND when config does not exist', async ({ assert }) => {
    const service = new EventConfigService(
      {
        findCurrentConfig: async () => null,
      } as any,
      new EventPayloadMapperService(),
      new InputSanitizerService()
    )

    try {
      await service.getCurrentConfig()
      assert.fail('Expected EventConfigNotFoundException')
    } catch (error) {
      assert.instanceOf(error, EventConfigNotFoundException)
      assert.equal(
        (error as EventConfigNotFoundException).errors[0]?.code,
        'EVENT_CONFIG_NOT_FOUND'
      )
    }
  })

  test('creates first event config when no event exists', async ({ assert }) => {
    const service = new EventConfigService(
      {
        findCurrentConfig: async () => null,
        createConfig: async (input: any) => ({
          id: 1,
          code: 'generatedeventcode01',
          name: input.name,
          date: input.date,
          venueAddress: input.venueAddress,
          deliveryAddress: input.deliveryAddress,
          mapsLink: input.mapsLink,
          coverImageUrl: input.coverImageUrl,
          pixKeyDad: input.pixKeyDad,
          pixKeyMom: input.pixKeyMom,
          pixQrcodeDad: input.pixQrcodeDad,
          pixQrcodeMom: input.pixQrcodeMom,
          updatedAt: new Date('2026-04-09T12:00:00.000Z'),
        }),
      } as any,
      new EventPayloadMapperService(),
      new InputSanitizerService()
    )

    const result = await service.updateConfig({
      name: 'Cha da Helena',
      date: '2026-06-18T15:00:00.000Z',
      venueAddress: 'Rua Exemplo, 123 - Sao Paulo/SP',
    })

    assert.equal(result.data.id, 1)
    assert.equal(result.data.name, 'Cha da Helena')
    assert.equal(result.data.venueAddress, 'Rua Exemplo, 123 - Sao Paulo/SP')
  })

  test('updates existing event config using patch semantics', async ({ assert }) => {
    const service = new EventConfigService(
      {
        findCurrentConfig: async () => ({
          id: 2,
          code: 'babyshower2026event1',
          name: 'Cha Antigo',
          date: new Date('2026-06-18T15:00:00.000Z'),
          venueAddress: 'Endereco Antigo',
          deliveryAddress: null,
          mapsLink: null,
          coverImageUrl: null,
          pixKeyDad: null,
          pixKeyMom: null,
          pixQrcodeDad: null,
          pixQrcodeMom: null,
          updatedAt: new Date('2026-04-09T12:00:00.000Z'),
        }),
        updateConfigById: async () => true,
      } as any,
      new EventPayloadMapperService(),
      new InputSanitizerService()
    )

    const result = await service.updateConfig({
      name: 'Cha da Helena',
    })

    assert.equal(result.data.id, 2)
    assert.equal(result.data.name, 'Cha da Helena')
    assert.equal(result.data.venueAddress, 'Endereco Antigo')
  })
})
