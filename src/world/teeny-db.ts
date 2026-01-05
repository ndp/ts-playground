import countryCodes from './country-codes.json'

class TeenyDB {
    langByCountryCode: Record<string, string[]> = {};

    constructor() {
        this.langByCountryCode = countryCodes.reduce((acc, entry) => {
            acc[entry['ISO3166-1-Alpha-2']] = entry['Languages'].split(',');
            return acc;
        }, {} as Record<string, string[]>);
        // console.log("langByCountryCode", this.langByCountryCode);
    }

    langs(countryCode: string): string[] {
        return this.langByCountryCode[countryCode] || [];
    }

    /**
     * Converts a two-letter ISO 3166-1 alpha-2 country code to a flag emoji.
     * @param {string} countryCode The two-letter country code (e.g., 'US', 'FR').
     * @returns {string} The corresponding flag emoji (e.g., '🇺🇸', '🇫🇷').
     */
    flagEmoji(countryCode: string): string {
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

}

export const teenyDb = new TeenyDB();