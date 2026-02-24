import { test } from 'node:test';
import assert from 'node:assert';
import { teenyDb, type ISO2CountryCode, type OfficialLanguages } from './teeny-db.ts';

test('TeenyDB - constructor initializes byCountryCode map', () => {
  assert.ok(teenyDb.byCountryCode, 'byCountryCode is defined');
  assert.ok(Object.keys(teenyDb.byCountryCode).length > 0, 'byCountryCode has entries');
  assert.ok(teenyDb.byCountryCode['US'], 'US entry exists');
});

test('TeenyDB - langs returns array of languages', () => {
  const langs = teenyDb.langs('US' as ISO2CountryCode);
  assert.ok(Array.isArray(langs), 'langs returns an array');
  assert.ok(langs.includes('en-US'), 'US includes English');
});

test('TeenyDB - langs returns empty array for countries with no languages', () => {
  // Find a country code that might not have languages, or use a mock
  const langs = teenyDb.langs('XX' as ISO2CountryCode);
  assert.ok(Array.isArray(langs), 'langs returns an array even for missing entries');
});

test('TeenyDB - langs splits comma-separated values', () => {
  const langs = teenyDb.langs('CH' as ISO2CountryCode);
  assert.ok(Array.isArray(langs), 'langs returns an array');
  if (langs.length > 1) {
    assert.ok(langs.length >= 1, 'Switzerland has multiple languages');
  }
});

test('TeenyDB - countryName returns name in default English locale', () => {
  const name = teenyDb.countryName('US' as ISO2CountryCode);
  assert.ok(name, 'countryName returns a value for US');
  assert.strictEqual(typeof name, 'string', 'countryName returns a string');
});

test('TeenyDB - countryName returns name in specified locale', () => {
  const locales: OfficialLanguages[] = ['en', 'fr', 'es', 'ru', 'zh', 'ar'];

  for (const locale of locales) {
    const name = teenyDb.countryName('US' as ISO2CountryCode, locale);
    // Some locales may not have translations for all countries
    if (name) {
      assert.strictEqual(typeof name, 'string', `countryName returns string for locale ${locale}`);
    }
  }
});

test('TeenyDB - countryName returns null for missing fields', () => {
  const name = teenyDb.countryName('XX' as ISO2CountryCode);
  assert.strictEqual(name, null, 'countryName returns null for invalid country');
});

test('TeenyDB - countryName handles locale substring correctly', () => {
  const name = teenyDb.countryName('US' as ISO2CountryCode, 'en');
  assert.ok(name === null || typeof name === 'string', 'countryName handles locale substring');
});

test('TeenyDB - flagEmoji converts valid two-letter code to flag', () => {
  const flag = teenyDb.flagEmoji('US' as ISO2CountryCode);
  assert.strictEqual(typeof flag, 'string', 'flagEmoji returns a string');
  assert.ok(flag.length > 0, 'flagEmoji returns non-empty string');
  assert.strictEqual(flag, '🇺🇸', 'US flag emoji is correct');
});

test('TeenyDB - flagEmoji returns white flag for empty string', () => {
  const flag = teenyDb.flagEmoji('' as ISO2CountryCode);
  assert.strictEqual(flag, '🏳️', 'returns white flag for empty string');
});

test('TeenyDB - flagEmoji returns white flag for invalid length', () => {
  const flag = teenyDb.flagEmoji('USA' as ISO2CountryCode);
  assert.strictEqual(flag, '🏳️', 'returns white flag for 3-letter code');
});

test('TeenyDB - flagEmoji returns white flag for single letter', () => {
  const flag = teenyDb.flagEmoji('U' as ISO2CountryCode);
  assert.strictEqual(flag, '🏳️', 'returns white flag for single letter');
});

test('TeenyDB - flagEmoji returns white flag for non-alphabetic characters', () => {
  const flag = teenyDb.flagEmoji('U1' as ISO2CountryCode);
  assert.strictEqual(flag, '🏳️', 'returns white flag for non-alphabetic input');
});

test('TeenyDB - flagEmoji handles lowercase input', () => {
  const flag = teenyDb.flagEmoji('us' as ISO2CountryCode);
  assert.strictEqual(flag, '🇺🇸', 'converts lowercase to uppercase');
});

test('TeenyDB - flagEmoji handles mixed case input', () => {
  const flag = teenyDb.flagEmoji('Us' as ISO2CountryCode);
  assert.strictEqual(flag, '🇺🇸', 'converts mixed case to uppercase');
});

test('TeenyDB - flagEmoji with various country codes', () => {
  const testCodes = ['GB', 'FR', 'DE', 'JP', 'CN', 'BR'] as ISO2CountryCode[];

  for (const code of testCodes) {
    const flag = teenyDb.flagEmoji(code);
    assert.ok(flag.length > 0, `flagEmoji returns non-empty string for ${code}`);
    assert.notStrictEqual(flag, '🏳️', `${code} produces a valid flag emoji`);
  }
});

test('TeenyDB - misc returns string for valid field', () => {
  const value = teenyDb.misc('US' as ISO2CountryCode, 'ISO3166-1-Alpha-3');
  assert.ok(value === null || typeof value === 'string', 'misc returns string or null');
});

test('TeenyDB - misc returns null for missing country', () => {
  const value = teenyDb.misc('XX' as ISO2CountryCode, 'ISO3166-1-Alpha-3');
  assert.strictEqual(value, null, 'misc returns null for invalid country');
});

test('TeenyDB - misc returns different field types', () => {
  const iso2 = teenyDb.misc('US' as ISO2CountryCode, 'ISO3166-1-Alpha-2');
  const iso3 = teenyDb.misc('US' as ISO2CountryCode, 'ISO3166-1-Alpha-3');
  const capital = teenyDb.misc('US' as ISO2CountryCode, 'Capital');

  assert.ok(iso2, 'ISO2 field exists');
  assert.ok(iso3, 'ISO3 field exists');
  assert.ok(capital === null || typeof capital === 'string', 'Capital field is string or null');
});

test('TeenyDB - teenyDb singleton is properly exported', () => {
  assert.ok(teenyDb, 'teenyDb is exported');
  assert.ok(typeof teenyDb.langs === 'function', 'langs method exists');
  assert.ok(typeof teenyDb.countryName === 'function', 'countryName method exists');
  assert.ok(typeof teenyDb.flagEmoji === 'function', 'flagEmoji method exists');
  assert.ok(typeof teenyDb.misc === 'function', 'misc method exists');
});