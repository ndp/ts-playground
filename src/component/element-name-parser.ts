/**
 * Utilities for parsing element/attribute names with bang (!) suffix.
 * Bang indicates the field is required/non-nullable.
 *
 * Examples:
 * - 'email!' -> name: 'email', required: true
 * - 'email'  -> name: 'email', required: false
 */

export interface ParsedFieldName {
  name: string
  required: boolean
}

/**
 * Parse a field name to extract the actual name and required flag.
 * @param input - Field name, optionally ending with '!'
 * @returns Object with name and required boolean
 */
export function parseFieldName(input: string): ParsedFieldName {
  if (input.endsWith('!')) {
    return {
      name: input.slice(0, -1),
      required: true
    }
  }
  return {
    name: input,
    required: false
  }
}

/**
 * Type utility: Extract the name without the bang.
 * 'email!' -> 'email'
 * 'email'  -> 'email'
 */
export type ExtractFieldName<T extends string> = T extends `${infer N}!` ? N : T

/**
 * Type utility: Determine if a field is required (ends with bang).
 * 'email!' -> true
 * 'email'  -> false
 */
export type IsRequired<T extends string> = T extends `${string}!` ? true : false

/**
 * Type utility: Build element type based on required flag.
 * If required: T (non-null)
 * If optional: T | null
 */
export type OptionalIfNeeded<T, FieldName extends string> = 
  IsRequired<FieldName> extends true ? T : T | null

/**
 * Type utility: Build attribute type (string) based on required flag.
 * If required: string (non-undefined)
 * If optional: string | undefined
 */
export type StringIfRequired<FieldName extends string> = 
  IsRequired<FieldName> extends true ? string : string | undefined
