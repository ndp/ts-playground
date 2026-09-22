
https://www.smashingmagazine.com/2025/08/power-intl-api-guide-browser-native-internationalization/

Countries JSON:
https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
https://geojson-maps.kyd.au/
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames

This seems promising: https://datahub.io/core/geo-countries

Project, all the information in the internal API browsable in a window... explorable.

ISO 3166-1 alpha-2
ISO 3166-1 alpha-3

Things to change:
- time zone
- locale
- currency
- units (meters, kilometers, miles, feet, inches, etc)

Things to add:
- fix ltr and rtl text direction
- format range
- The Intl.DisplayNames() object generates names for languages, scripts, regions, and currencies. You would typically use it to create language or similar selectors (English, inglés, anglais etc.) Initialize it with:

      A locale object, string, or empty array for the user’s current locale, and
      An options object.
      Use the name builder tool…
    
      The tool generates code for example names using options properties listed on MDN.
    
      The .of() method returns a string according to a code passed. Examples:
    
      // French language in Italian: "francese (Francia)"
      new Intl.DisplayNames(
      "it-IT",
      { "type": "language" }
      ).of( "fr-FR" );
      // Egyptian hieroglyphs in German: "Ägyptische Hieroglyphen"
      new Intl.DisplayNames(
      "de-DE",
      { "type": "script" }
      ).of( "Egyp" );
      // Australia in French: "Australie"
      new Intl.DisplayNames(
      "fr-FR",
      { "type": "region" }
      ).of( "AU" );
      // British Pounds in Polish: "funt szterling"
      new Intl.DisplayNames(
      "pl-PL",
      { "type": "currency" }
      ).of( "GBP" );

"Who needs a map when you have an astrolabe?" - @sindresorhus @purplepeterson