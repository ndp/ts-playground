// const countryCodes = await fetch('./country-codes.json').then(res => res.json())
import {default as countryCodes} from './country-codes.json' with { type: 'json' };

// console.log('*********', countryCodes);

type Letter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';
export type ISO2CountryCode = `${Letter}${Letter}`;
type ISOCodeKeys = 'ISO3166-1-Alpha-2' | 'ISO3166-1-Alpha-3';
type MiscKeys = 'Languages' | 'Capital' | 'Dial' | 'TLD' | 'ISO4217-currency_alphabetic_code' | 'ISO4217-currency_country_name' | 'ISO4217-currency_minor_unit' | 'ISO4217-currency_name';
export type OfficialLanguages = 'en' | 'fr' | 'es' | 'ru' | 'zh' | 'ar';
type NameKeys = `official_name_${OfficialLanguages}`;
type ValidKeys = ISOCodeKeys | MiscKeys | NameKeys;
type CountryCodeEntry = Record<ValidKeys, string> & {
    ['ISO3166-1-Alpha-2']: ISO2CountryCode;
    [key: string]: string|number;
}
type CountryCodes = Array<CountryCodeEntry>;


class TeenyDB {
    byCountryCode: { [k in ISO2CountryCode]?: CountryCodeEntry } = {};

    constructor() {
        this.byCountryCode = (countryCodes as unknown as CountryCodes).reduce((acc, entry) => {
            acc[entry['ISO3166-1-Alpha-2']] = entry;
            return acc;
        }, {} as Record<ISO2CountryCode, CountryCodeEntry>);
    }

    langs(countryCode: ISO2CountryCode): string[] {
        return this.misc(countryCode, 'Languages')?.split(',') ?? []
    }

    countryName(iso2Code: ISO2CountryCode, locale: OfficialLanguages = 'en'): string | null {
        return this.misc(iso2Code, `official_name_${locale.substring(0, 2)}` as NameKeys);
    }

    /**
     * Converts a two-letter ISO 3166-1 alpha-2 country code to a flag emoji.
     * @param {string} countryCode The two-letter country code (e.g., 'US', 'FR').
     * @returns {string} The corresponding flag emoji (e.g., '🇺🇸', '🇫🇷').
     */
    flagEmoji(countryCode: ISO2CountryCode): string {
        // Ensure the input is a valid two-letter string
        if (!countryCode || countryCode.length !== 2 || !/^[a-zA-Z]{2}$/.test(countryCode)) {
            console.error("Invalid country code provided. Must be a two-letter ISO code.");
            return '🏳️'; // Return a white flag or other indicator for an error
        }

        const codePoints = countryCode
            .toUpperCase() // Convert to uppercase for consistent char codes
            .split('')     // Split into an array of characters
            .map(char => {
                // The offset from ASCII 'A' to the Unicode Regional Indicator Symbol '🇦' (U+1F1E6)
                const regionalIndicatorBase = 127397; // 0x1F1A5 in hex
                return regionalIndicatorBase + char.charCodeAt(0);
            });

        // Create the emoji string from the calculated Unicode code points
        return String.fromCodePoint(...codePoints);
    }

    misc(countryCode: ISO2CountryCode, field: MiscKeys|NameKeys|ISOCodeKeys): string | null {
        return this.byCountryCode[countryCode]?.[field] as string || null;
    }
}

export const teenyDb = new TeenyDB();