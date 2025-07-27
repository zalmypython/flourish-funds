// Free stock API service using Alpha Vantage
// Free tier: 25 requests/day, 5 requests/minute

interface AlphaVantageQuote {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

interface AlphaVantageSearch {
  bestMatches: Array<{
    '1. symbol': string;
    '2. name': string;
    '3. type': string;
    '4. region': string;
    '5. marketOpen': string;
    '6. marketClose': string;
    '7. timezone': string;
    '8. currency': string;
    '9. matchScore': string;
  }>;
}

// Cache to respect API rate limits
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Get API key from localStorage or use demo
const getApiKey = () => {
  return localStorage.getItem('alphavantage_api_key') || 'demo';
};

// Function to set API key
export const setAlphaVantageApiKey = (apiKey: string) => {
  localStorage.setItem('alphavantage_api_key', apiKey);
};

class StockApiService {
  private baseUrl = 'https://www.alphavantage.co/query';

  private async fetchWithCache<T>(url: string, cacheKey: string): Promise<T> {
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check for API error
      if (data['Error Message']) {
        throw new Error(data['Error Message']);
      }
      
      if (data['Note']) {
        throw new Error('API rate limit exceeded. Please try again later.');
      }

      // Cache the result
      cache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data;
    } catch (error) {
      console.error('Stock API error:', error);
      throw error;
    }
  }

  async getStockQuote(symbol: string) {
    const API_KEY = getApiKey();
    const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
    const cacheKey = `quote_${symbol}`;
    
    try {
      const data = await this.fetchWithCache<AlphaVantageQuote>(url, cacheKey);
      const quote = data['Global Quote'];
      
      return {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
        lastUpdated: new Date(quote['07. latest trading day']),
      };
    } catch (error) {
      // Return mock data for demo purposes
      console.warn('Using mock data for stock quote:', symbol);
      return this.getMockQuote(symbol);
    }
  }

  async searchStocks(query: string) {
    const API_KEY = getApiKey();
    const url = `${this.baseUrl}?function=SYMBOL_SEARCH&keywords=${query}&apikey=${API_KEY}`;
    const cacheKey = `search_${query}`;
    
    try {
      const data = await this.fetchWithCache<AlphaVantageSearch>(url, cacheKey);
      
      return data.bestMatches.map(match => ({
        symbol: match['1. symbol'],
        name: match['2. name'],
        type: match['3. type'],
        region: match['4. region'],
        matchScore: parseFloat(match['9. matchScore']),
      }));
    } catch (error) {
      // Return mock data for demo purposes
      console.warn('Using mock data for stock search:', query);
      return this.getMockSearchResults(query);
    }
  }

  // Enhanced mock data with S&P 500 stocks
  private getMockQuote(symbol: string) {
    const mockPrices: Record<string, number> = {
      // Tech Giants
      'AAPL': 175.43, 'GOOGL': 138.21, 'MSFT': 378.85, 'AMZN': 146.92,
      'META': 296.73, 'TSLA': 248.87, 'NVDA': 875.28, 'NFLX': 445.92,
      // Financial
      'JPM': 165.42, 'BAC': 34.56, 'WFC': 45.23, 'GS': 385.67,
      'MS': 89.34, 'C': 58.91, 'USB': 42.17, 'PNC': 154.82,
      // Healthcare
      'JNJ': 162.78, 'PFE': 29.45, 'UNH': 523.91, 'ABBV': 173.25,
      'MRK': 108.67, 'TMO': 545.23, 'ABT': 112.89, 'BMY': 56.34,
      // Consumer
      'KO': 62.15, 'PEP': 171.32, 'WMT': 163.45, 'HD': 345.67,
      'MCD': 289.12, 'NKE': 102.78, 'SBUX': 98.45, 'TGT': 142.56,
      // Energy
      'XOM': 115.23, 'CVX': 158.91, 'COP': 134.67, 'EOG': 128.45,
      'SLB': 48.92, 'PXD': 245.78, 'KMI': 18.76, 'OKE': 134.23,
      // Industrial
      'BA': 204.56, 'CAT': 347.89, 'GE': 168.45, 'MMM': 132.67,
      'HON': 198.34, 'UPS': 134.78, 'RTX': 114.56, 'LMT': 445.23,
      // ETFs
      'SPY': 456.78, 'QQQ': 378.91, 'IWM': 201.45, 'VTI': 234.67,
      'VOO': 412.34, 'VEA': 49.23, 'VWO': 41.78, 'BND': 79.45,
    };

    const basePrice = mockPrices[symbol.toUpperCase()] || (50 + Math.random() * 200);
    const change = (Math.random() - 0.5) * (basePrice * 0.05); // Max 5% daily change
    const changePercent = (change / basePrice) * 100;

    return {
      symbol: symbol.toUpperCase(),
      price: Math.round((basePrice + change) * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: Math.floor(Math.random() * 50000000) + 1000000,
      lastUpdated: new Date(),
    };
  }

  private getMockSearchResults(query: string) {
    const mockStocks = [
      // Tech Giants
      { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Discretionary' },
      { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology' },
      { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Discretionary' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology' },
      { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communication Services' },
      
      // Financial
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financials' },
      { symbol: 'BAC', name: 'Bank of America Corp.', sector: 'Financials' },
      { symbol: 'WFC', name: 'Wells Fargo & Company', sector: 'Financials' },
      { symbol: 'GS', name: 'The Goldman Sachs Group Inc.', sector: 'Financials' },
      { symbol: 'MS', name: 'Morgan Stanley', sector: 'Financials' },
      { symbol: 'C', name: 'Citigroup Inc.', sector: 'Financials' },
      
      // Healthcare
      { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
      { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare' },
      { symbol: 'UNH', name: 'UnitedHealth Group Inc.', sector: 'Healthcare' },
      { symbol: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare' },
      { symbol: 'MRK', name: 'Merck & Co. Inc.', sector: 'Healthcare' },
      { symbol: 'TMO', name: 'Thermo Fisher Scientific Inc.', sector: 'Healthcare' },
      
      // Consumer
      { symbol: 'KO', name: 'The Coca-Cola Company', sector: 'Consumer Staples' },
      { symbol: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer Staples' },
      { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Staples' },
      { symbol: 'HD', name: 'The Home Depot Inc.', sector: 'Consumer Discretionary' },
      { symbol: 'MCD', name: 'McDonald\'s Corporation', sector: 'Consumer Discretionary' },
      { symbol: 'NKE', name: 'NIKE Inc.', sector: 'Consumer Discretionary' },
      
      // Energy
      { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy' },
      { symbol: 'CVX', name: 'Chevron Corporation', sector: 'Energy' },
      { symbol: 'COP', name: 'ConocoPhillips', sector: 'Energy' },
      
      // Industrial
      { symbol: 'BA', name: 'The Boeing Company', sector: 'Industrials' },
      { symbol: 'CAT', name: 'Caterpillar Inc.', sector: 'Industrials' },
      { symbol: 'GE', name: 'General Electric Company', sector: 'Industrials' },
      { symbol: 'MMM', name: '3M Company', sector: 'Industrials' },
      
      // ETFs
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', sector: 'ETF' },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust', sector: 'ETF' },
      { symbol: 'IWM', name: 'iShares Russell 2000 ETF', sector: 'ETF' },
      { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', sector: 'ETF' },
      { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', sector: 'ETF' },
    ];

    const filtered = mockStocks.filter(stock => 
      stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
      stock.name.toLowerCase().includes(query.toLowerCase()) ||
      stock.sector.toLowerCase().includes(query.toLowerCase())
    );

    return filtered
      .sort((a, b) => {
        // Prioritize exact symbol matches
        if (a.symbol.toLowerCase() === query.toLowerCase()) return -1;
        if (b.symbol.toLowerCase() === query.toLowerCase()) return 1;
        
        // Then prioritize symbol starts with
        if (a.symbol.toLowerCase().startsWith(query.toLowerCase())) return -1;
        if (b.symbol.toLowerCase().startsWith(query.toLowerCase())) return 1;
        
        return 0;
      })
      .slice(0, 10) // Limit to top 10 results
      .map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        type: stock.sector === 'ETF' ? 'ETF' : 'Equity',
        region: 'United States',
        matchScore: 1.0,
      }));
  }
}

export const stockApi = new StockApiService();