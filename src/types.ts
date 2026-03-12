export interface ParseOptions {
  debug?: boolean
  multiline?: boolean
}

export interface ParsedLine {
  key: string
  value: string
  line: number
}

export interface ParseResult {
  parsed: Record<string, string>
  errors: Array<{ line: number; message: string }>
}

export interface ExpandOptions {
  processEnv?: Record<string, string>
  parsed?: Record<string, string>
  recursive?: boolean
}

export interface LoadOptions extends ParseOptions, ExpandOptions {
  path?: string
  encoding?: BufferEncoding
  override?: boolean
  expand?: boolean
}

export interface LoadResult {
  parsed: Record<string, string>
  errors: Array<{ line: number; message: string }>
}

export type SchemaType = 'string' | 'number' | 'boolean' | 'url' | 'email' | 'json'

export interface SchemaField {
  type?: SchemaType
  required?: boolean
  default?: string
  pattern?: RegExp
  enum?: string[]
  transform?: (value: string) => any
}

export type Schema = Record<string, SchemaField>

export interface ValidationError {
  key: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  values: Record<string, any>
}
