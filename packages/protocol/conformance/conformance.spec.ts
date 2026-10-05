import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Ajv2020 from 'ajv/dist/2020'
import { parseClientMessage, parseServerMessage } from '../src'

interface ConformanceCase {
  name:      string
  direction: 'client' | 'server'
  valid:     boolean
  message?:  unknown
  raw?:      string
  skip?:     string[]
}

const read = (relative: string): unknown => JSON.parse(readFileSync(join(__dirname, relative), 'utf8'))
const { cases } = read('cases.json') as { cases: ConformanceCase[] }
const schemas = {
  server: read('../schema/server-message.schema.json') as object,
  client: read('../schema/client-message.schema.json') as object,
}

const ajv = new Ajv2020({ strict: true })
const validate = { server: ajv.compile(schemas.server), client: ajv.compile(schemas.client) }

/** The frame a runner sends: `raw` as is, otherwise the message serialised. */
const frameOf = (testCase: ConformanceCase): string => testCase.raw ?? JSON.stringify(testCase.message)

describe('conformance cases', () => {
  it('covers both directions, and accepts and rejects in both', () => {
    for (const direction of ['client', 'server'] as const) {
      expect(cases.some(testCase => testCase.direction === direction && testCase.valid)).toBe(true)
      expect(cases.some(testCase => testCase.direction === direction && !testCase.valid)).toBe(true)
    }
  })

  describe.each(cases)('$direction: $name', testCase => {
    it(`the TypeScript parser ${testCase.valid ? 'accepts' : 'rejects'} it`, () => {
      const parse = testCase.direction === 'server' ? parseServerMessage : parseClientMessage

      expect(parse(frameOf(testCase)).ok).toBe(testCase.valid)
    })

    it(`the JSON Schema ${testCase.valid ? 'accepts' : 'rejects'} it`, () => {
      let value: unknown
      try {
        value = JSON.parse(frameOf(testCase))
      } catch {
        // Not JSON at all: there is nothing for a schema to judge, and it must not be a valid case.
        expect(testCase.valid).toBe(false)

        return
      }

      expect(validate[testCase.direction](value)).toBe(testCase.valid)
    })
  })
})

describe('the schemas', () => {
  it.each(Object.entries(schemas))('%s is a valid JSON Schema with its own identifier', (_direction, schema) => {
    expect(ajv.validateSchema(schema)).toBe(true)
    expect((schema as { $id?: string }).$id).toMatch(/^urn:treactui:schema:/)
  })
})
