import { config, configAsync, load, loadSync } from './core/loader.js'
import { parse, parseDetailed } from './core/parser.js'
import { expand, ExpansionError } from './core/expander.js'
import { validate } from './core/validator.js'

// Export all functions
export {
  config,
  configAsync,
  load,
  loadSync,
  parse,
  parseDetailed,
  expand,
  ExpansionError,
  validate,
}

// Export all types
export type {
  LoadOptions,
  LoadResult,
  ConfigResult,
  ParseOptions,
  ParseResult,
  ParseError,
  ParseErrorCode,
  ExpandOptions,
  ExpansionErrorCode,
  Schema,
  SchemaField,
  SchemaType,
  InferSchema,
  InferSchemaField,
  ValidationResult,
  ValidationError,
} from './types.js'

// Default export for dotenv compatibility
export default {
  config,
  configAsync,
  parse,
  parseDetailed,
  expand,
  validate,
}
