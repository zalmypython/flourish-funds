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

// You'll need to get a free API key from Alpha Vantage
const API_KEY = 'demo'; // Replace with actual API key when ready

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

  // Mock data for demo purposes
  private getMockQuote(symbol: string) {
    const mockPrices: Record<string, number> = {
      'AAPL': 175.43,
      'GOOGL': 138.21,
      'MSFT': 378.85,
      'TSLA': 248.87,
      'AMZN': 146.92,
      'NVDA': 875.28,
      'META': 296.73,
      'NFLX': 445.92,
    };

    const basePrice = mockPrices[symbol.toUpperCase()] || 100;
    const change = (Math.random() - 0.5) * 10;
    const changePercent = (change / basePrice) * 100;

    return {
      symbol: symbol.toUpperCase(),
      price: basePrice + change,
      change: change,
      changePercent: changePercent,
      volume: Math.floor(Math.random() * 10000000),
      lastUpdated: new Date(),
    };
  }

  private getMockSearchResults(query: string) {
    const mockStocks = [
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.' },
      { symbol: 'MSFT', name: 'Microsoft Corporation' },
      { symbol: 'TSLA', name: 'Tesla Inc.' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation' },
      { symbol: 'META', name: 'Meta Platforms Inc.' },
      { symbol: 'NFLX', name: 'Netflix Inc.' },
    ];

    return mockStocks
      .filter(stock => 
        stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
        stock.name.toLowerCase().includes(query.toLowerCase())
      )
      .map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        type: 'Equity',
        region: 'United States',
        matchScore: 1.0,
      }));
  }
}

export const stockApi = new StockApiService();