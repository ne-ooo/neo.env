import { load, loadSync } from './core/loader.js'
import { parse } from './core/parser.js'
import { expand } from './core/expander.js'
import { validate } from './core/validator.js'

// Export all functions
export { load, loadSync, parse, expand, validate }

// Export all types
export type {
  LoadOptions,
  LoadResult,
  ParseOptions,
  ParseResult,
  ExpandOptions,
  Schema,
  SchemaField,
  SchemaType,
  ValidationResult,
  ValidationError,
} from './types.js'

// Default export for dotenv compatibility
export default {
  config: loadSync, // dotenv.config() compatibility
  configAsync: load, // Async version
  parse,
  expand,
  validate,
}
