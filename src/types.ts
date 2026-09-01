export interface ParsedLine {
  key: string
  value: string
  line: number
}

export interface ParseResult {
  parsed: Record<string, string>
  errors: ParseError[]
}

export type ParseErrorCode = 'INVALID_ENTRY' | 'TOO_MANY_ERRORS'

export interface ParseError {
  code: ParseErrorCode
  line: number
  message: string
}

export interface ExpandOptions {
  processEnv?: Record<string, string | undefined>
  parsed?: Record<string, string>
  recursive?: boolean
  maxDepth?: number
  maxOutputLength?: number
  maxTotalOutputLength?: number
  maxExpansionWorkLength?: number
}

export interface LoadOptions {
  path?: string
  encoding?: BufferEncoding
  override?: boolean
  expand?: boolean
  processEnv?: Record<string, string | undefined>
  recursive?: boolean
  maxDepth?: number
  maxOutputLength?: number
  maxTotalOutputLength?: number
  maxExpansionWorkLength?: number
  allowPartial?: boolean
}

export interface LoadResult {
  parsed: Record<string, string>
  errors: ParseError[]
}

export interface ConfigResult {
  parsed?: Record<string, string>
  error?: Error
}

export type ExpansionErrorCode =
  | 'CYCLE'
  | 'MAX_DEPTH'
  | 'MAX_OUTPUT_LENGTH'
  | 'MAX_TOTAL_OUTPUT_LENGTH'
  | 'MAX_EXPANSION_WORK_LENGTH'

export type SchemaType = 'string' | 'number' | 'boolean' | 'url' | 'email' | 'json'

export interface SchemaField {
  type?: SchemaType
  required?: boolean
  default?: string
  pattern?: RegExp
  enum?: string[]
  transform?: (value: string) => unknown
}

export type Schema = Record<string, SchemaField>

export type InferSchemaField<TField extends SchemaField> =
  TField extends { transform: (value: string) => infer TOutput }
    ? TOutput
    : TField extends { type: 'number' }
      ? number
      : TField extends { type: 'boolean' }
        ? boolean
        : TField extends { type: 'json' }
          ? unknown
          : string

type RequiredSchemaKey<TSchema extends Schema> = {
  [TKey in keyof TSchema]-?: TSchema[TKey] extends
    | { required: true }
    | { default: string }
    ? TKey
    : never
}[keyof TSchema]

type Simplify<TValue> = { [TKey in keyof TValue]: TValue[TKey] } & {}

export type InferSchema<TSchema extends Schema> = string extends keyof TSchema
  ? Record<string, unknown>
  : Simplify<
      {
        [TKey in RequiredSchemaKey<TSchema>]: InferSchemaField<TSchema[TKey]>
      } & {
        [TKey in Exclude<keyof TSchema, RequiredSchemaKey<TSchema>>]?: InferSchemaField<
          TSchema[TKey]
        >
      }
    >

export interface ValidationError {
  key: string
  message: string
}

export type ValidationResult<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> =
  | {
      valid: true
      errors: []
      values: TValues
    }
  | {
      valid: false
      errors: ValidationError[]
      values: Partial<TValues>
    }
