// Country name to ISO 3166-1 alpha-2 code mapping
const countryCodeMap = {
  'united states': 'us',
  'france': 'fr',
  'germany': 'de',
  'italy': 'it',
  'spain': 'es',
  'united kingdom': 'gb',
  'japan': 'jp',
  'china': 'cn',
  'south korea': 'kr',
  'canada': 'ca',
  'australia': 'au',
  'netherlands': 'nl',
  'belgium': 'be',
  'switzerland': 'ch',
  'sweden': 'se',
  'norway': 'no',
  'denmark': 'dk',
  'finland': 'fi',
  'poland': 'pl',
  'austria': 'at',
  'portugal': 'pt',
  'greece': 'gr',
  'turkey': 'tr',
  'india': 'in',
  'brazil': 'br',
  'mexico': 'mx',
  'argentina': 'ar',
  'south africa': 'za',
  'egypt': 'eg',
  'saudi arabia': 'sa',
  'uae': 'ae',
  'united arab emirates': 'ae',
  'kuwait': 'kw',
  'qatar': 'qa',
  'bahrain': 'bh',
  'oman': 'om',
  'jordan': 'jo',
  'lebanon': 'lb',
  'singapore': 'sg',
  'malaysia': 'my',
  'thailand': 'th',
  'indonesia': 'id',
  'philippines': 'ph',
  'vietnam': 'vn',
  'new zealand': 'nz',
  'ireland': 'ie',
  'israel': 'il',
  'czech republic': 'cz',
  'hungary': 'hu',
  'romania': 'ro',
  'russia': 'ru',
  'ukraine': 'ua',
};

/**
 * Get country code from country name
 */
function getCountryCode(countryName) {
  if (!countryName) return null;
  const normalized = countryName.toLowerCase().trim();
  return countryCodeMap[normalized] || null;
}

/**
 * Get flag image URL for a country
 * Uses flagcdn.com CDN for flag images
 */
export function getFlagImageUrl(countryName, flagImage = null) {
  // If flag_image is provided in database, use it
  if (flagImage) {
    return flagImage;
  }
  
  // Otherwise, generate from country code
  const countryCode = getCountryCode(countryName);
  if (countryCode) {
    // Using flagcdn.com - provides high quality flag images
    return `https://flagcdn.com/w20/${countryCode}.png`;
  }
  
  return null;
}

