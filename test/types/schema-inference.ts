import { validate } from '../../src/index.js'
import type {
  InferSchema,
  Schema,
  ValidationResult,
} from '../../src/index.js'

const schema = {
  PORT: { type: 'number', required: true },
  DEBUG: { type: 'boolean' },
  HOST: { default: 'localhost' },
  PAYLOAD: { type: 'json', required: true },
  TAGS: {
    required: true,
    transform: (value: string) => value.split(','),
  },
} satisfies Schema

type Configuration = InferSchema<typeof schema>

const inferred = validate(
  {
    PORT: '3000',
    PAYLOAD: '{"enabled":true}',
    TAGS: 'api,worker',
  },
  schema
)

const configuration: Configuration = inferred.values
const typedResult: ValidationResult<Configuration> = inferred
const port: number = configuration.PORT
const debug: boolean | undefined = configuration.DEBUG
const host: string = configuration.HOST
const payload: unknown = configuration.PAYLOAD
const tags: string[] = configuration.TAGS

void [typedResult, port, debug, host, payload, tags]

// @ts-expect-error A number field does not produce a string.
const invalidPort: string = configuration.PORT

// @ts-expect-error The schema does not contain this field.
configuration.UNKNOWN_FIELD

// @ts-expect-error JSON output must be narrowed before property access.
configuration.PAYLOAD.enabled

// A broad schema cannot provide field-specific output types.
const dynamicSchema: Schema = { PORT: { type: 'number' } }
const dynamicValues: Record<string, unknown> = validate({}, dynamicSchema).values
void dynamicValues
