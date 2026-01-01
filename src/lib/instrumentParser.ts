/**
 * Instrument Parsing Utilities
 * 
 * Provides consistent, reliable parsing of trading instrument symbols
 * across different venue formats and product types.
 */

export interface ParsedInstrument {
  symbol: string;          // Original symbol
  baseAsset: string;       // e.g., "BTC"
  quoteAsset: string;      // e.g., "USDT"
  productType: ProductType;
  venueSymbol?: string;    // Venue-specific format if known
  isInverse: boolean;      // Inverse contract (e.g., BTCUSD)
  expiry?: string;         // For futures: "PERP" or "240329"
}

export type ProductType = 'spot' | 'futures' | 'perpetual' | 'option' | 'swap' | 'unknown';

// Common quote assets ordered by priority
const QUOTE_ASSETS = [
  'USDT', 'USDC', 'BUSD', 'USD', 'EUR', 'GBP', 'JPY',
  'BTC', 'ETH', 'BNB', 'SOL', 'DAI', 'TUSD', 'PAX',
];

// Common suffixes that indicate product type
const PERP_SUFFIXES = ['PERP', '-PERP', '_PERP', 'PERPETUAL'];
const SWAP_SUFFIXES = ['SWAP', '-SWAP', '_SWAP'];
const FUTURES_PATTERN = /[_-]?\d{6}$/; // e.g., BTC-240329 or BTCUSDT240329

/**
 * Parse a trading instrument symbol into its components
 */
export function parseInstrument(symbol: string): ParsedInstrument {
  if (!symbol || typeof symbol !== 'string') {
    return createUnknownInstrument(symbol || '');
  }

  const upperSymbol = symbol.toUpperCase().trim();
  let workingSymbol = upperSymbol;
  let productType: ProductType = 'spot';
  let expiry: string | undefined;
  let isInverse = false;

  // Check for perpetual markers
  for (const suffix of PERP_SUFFIXES) {
    if (workingSymbol.endsWith(suffix)) {
      productType = 'perpetual';
      expiry = 'PERP';
      workingSymbol = workingSymbol.slice(0, -suffix.length);
      break;
    }
    if (workingSymbol.includes(suffix)) {
      productType = 'perpetual';
      expiry = 'PERP';
      workingSymbol = workingSymbol.replace(suffix, '');
      break;
    }
  }

  // Check for swap markers
  if (productType === 'spot') {
    for (const suffix of SWAP_SUFFIXES) {
      if (workingSymbol.includes(suffix)) {
        productType = 'swap';
        workingSymbol = workingSymbol.replace(suffix, '');
        break;
      }
    }
  }

  // Check for futures expiry (e.g., BTCUSDT240329)
  if (productType === 'spot') {
    const futuresMatch = workingSymbol.match(FUTURES_PATTERN);
    if (futuresMatch) {
      productType = 'futures';
      expiry = futuresMatch[0].replace(/[_-]/, '');
      workingSymbol = workingSymbol.replace(FUTURES_PATTERN, '');
    }
  }

  // Parse base and quote assets
  const { baseAsset, quoteAsset } = parseBaseQuote(workingSymbol);

  // Detect inverse contracts (e.g., BTCUSD vs BTCUSDT)
  if (quoteAsset === 'USD' && productType !== 'spot') {
    isInverse = true;
  }

  return {
    symbol: upperSymbol,
    baseAsset,
    quoteAsset,
    productType,
    isInverse,
    expiry,
  };
}

/**
 * Parse base and quote assets from a symbol
 */
function parseBaseQuote(symbol: string): { baseAsset: string; quoteAsset: string } {
  // Handle common delimiters
  const delimiters = ['-', '_', '/', ':'];
  for (const delimiter of delimiters) {
    if (symbol.includes(delimiter)) {
      const parts = symbol.split(delimiter);
      if (parts.length >= 2) {
        return {
          baseAsset: parts[0],
          quoteAsset: parts[1],
        };
      }
    }
  }

  // Try to find quote asset by matching known quotes
  for (const quote of QUOTE_ASSETS) {
    if (symbol.endsWith(quote)) {
      const base = symbol.slice(0, -quote.length);
      if (base.length >= 2) {
        return {
          baseAsset: base,
          quoteAsset: quote,
        };
      }
    }
  }

  // Fallback: assume last 3-4 chars are quote
  if (symbol.length >= 6) {
    // Try 4-char quote first (USDT, USDC, etc.)
    const quote4 = symbol.slice(-4);
    if (QUOTE_ASSETS.includes(quote4)) {
      return {
        baseAsset: symbol.slice(0, -4),
        quoteAsset: quote4,
      };
    }
    // Try 3-char quote (USD, BTC, ETH, etc.)
    const quote3 = symbol.slice(-3);
    if (QUOTE_ASSETS.includes(quote3)) {
      return {
        baseAsset: symbol.slice(0, -3),
        quoteAsset: quote3,
      };
    }
  }

  // Ultimate fallback
  return {
    baseAsset: symbol,
    quoteAsset: 'USD',
  };
}

function createUnknownInstrument(symbol: string): ParsedInstrument {
  return {
    symbol,
    baseAsset: 'UNKNOWN',
    quoteAsset: 'USD',
    productType: 'unknown',
    isInverse: false,
  };
}

/**
 * Convert a parsed instrument to Binance format
 */
export function toBinanceSymbol(instrument: ParsedInstrument): string {
  return `${instrument.baseAsset}${instrument.quoteAsset}`.toUpperCase();
}

/**
 * Convert a parsed instrument to Coinbase format
 */
export function toCoinbaseSymbol(instrument: ParsedInstrument): string {
  return `${instrument.baseAsset}-${instrument.quoteAsset}`.toUpperCase();
}

/**
 * Convert a parsed instrument to standard format (BASE-QUOTE)
 */
export function toStandardSymbol(instrument: ParsedInstrument): string {
  return `${instrument.baseAsset}-${instrument.quoteAsset}`;
}

/**
 * Check if instrument is a perpetual/perp
 */
export function isPerpetual(instrument: ParsedInstrument): boolean {
  return instrument.productType === 'perpetual' || instrument.productType === 'swap';
}

/**
 * Check if instrument is a derivative (not spot)
 */
export function isDerivative(instrument: ParsedInstrument): boolean {
  return instrument.productType !== 'spot' && instrument.productType !== 'unknown';
}

/**
 * Normalize any instrument string to a consistent format
 */
export function normalizeInstrument(symbol: string): string {
  const parsed = parseInstrument(symbol);
  return toStandardSymbol(parsed);
}

/**
 * Get display name for an instrument
 */
export function getInstrumentDisplayName(symbol: string): string {
  const parsed = parseInstrument(symbol);
  let name = `${parsed.baseAsset}/${parsed.quoteAsset}`;
  
  if (parsed.productType === 'perpetual') {
    name += ' PERP';
  } else if (parsed.productType === 'futures' && parsed.expiry) {
    name += ` ${parsed.expiry}`;
  } else if (parsed.productType === 'swap') {
    name += ' SWAP';
  }
  
  return name;
}
