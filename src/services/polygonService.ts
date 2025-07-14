// Polygon.io API service for real-time stock data and dividends
export interface PolygonStockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

export interface PolygonDividendData {
  exDividendDate: string;
  paymentDate: string;
  recordDate: string;
  declaredDate: string;
  amount: number;
  frequency: number;
  ticker: string;
}

export class PolygonService {
  private static readonly BASE_URL = import.meta.env.DEV ? '/api/polygon' : 'https://api.polygon.io';
  private static readonly API_KEY = import.meta.env.VITE_POLYGON_API_KEY;

  // Get current stock price
  static async getCurrentPrice(symbol: string = 'ULTY'): Promise<{
    success: boolean;
    data?: PolygonStockData;
    error?: string;
  }> {
    try {
      if (!this.API_KEY) {
        return {
          success: false,
          error: 'Polygon API key not configured'
        };
      }

      // Get previous close price (most reliable for current price)
      const response = await fetch(
        `${this.BASE_URL}/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${this.API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        throw new Error('No price data available');
      }

      const result = data.results[0];
      
      return {
        success: true,
        data: {
          symbol: symbol.toUpperCase(),
          price: result.c, // Close price
          change: result.c - result.o, // Close - Open
          changePercent: ((result.c - result.o) / result.o) * 100,
          timestamp: result.t
        }
      };
    } catch (error) {
      console.error('Error fetching current price:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Get real-time quote (if available)
  static async getRealTimeQuote(symbol: string = 'ULTY'): Promise<{
    success: boolean;
    data?: PolygonStockData;
    error?: string;
  }> {
    try {
      if (!this.API_KEY) {
        return {
          success: false,
          error: 'Polygon API key not configured'
        };
      }

      const response = await fetch(
        `${this.BASE_URL}/v2/last/nbbo/${symbol}?apikey=${this.API_KEY}`
      );

      if (!response.ok) {
        // Fall back to previous close if real-time not available
        return this.getCurrentPrice(symbol);
      }

      const data = await response.json();

      if (data.status !== 'OK' || !data.results) {
        // Fall back to previous close
        return this.getCurrentPrice(symbol);
      }

      const result = data.results;
      const midPrice = (result.P + result.p) / 2; // Average of bid and ask

      return {
        success: true,
        data: {
          symbol: symbol.toUpperCase(),
          price: midPrice,
          change: 0, // Real-time doesn't provide change
          changePercent: 0,
          timestamp: result.t
        }
      };
    } catch (error) {
      console.error('Error fetching real-time quote:', error);
      // Fall back to previous close
      return this.getCurrentPrice(symbol);
    }
  }

  // Get dividend data
  static async getDividends(symbol: string = 'ULTY', limit: number = 50): Promise<{
    success: boolean;
    data?: PolygonDividendData[];
    error?: string;
  }> {
    try {
      if (!this.API_KEY) {
        return {
          success: false,
          error: 'Polygon API key not configured'
        };
      }

      const response = await fetch(
        `${this.BASE_URL}/v3/reference/dividends?ticker=${symbol}&limit=${limit}&sort=ex_dividend_date&order=desc&apikey=${this.API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status !== 'OK' || !data.results) {
        throw new Error('No dividend data available');
      }

      const dividends = data.results.map((div: any) => ({
        exDividendDate: div.ex_dividend_date,
        paymentDate: div.pay_date,
        recordDate: div.record_date,
        declaredDate: div.declaration_date,
        amount: div.cash_amount,
        frequency: div.frequency,
        ticker: div.ticker
      }));

      return {
        success: true,
        data: dividends
      };
    } catch (error) {
      console.error('Error fetching dividends:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Get comprehensive stock data (price + dividends)
  static async getStockData(symbol: string = 'ULTY'): Promise<{
    success: boolean;
    price?: PolygonStockData;
    dividends?: PolygonDividendData[];
    error?: string;
  }> {
    try {
      const [priceResult, dividendResult] = await Promise.all([
        this.getRealTimeQuote(symbol),
        this.getDividends(symbol)
      ]);

      if (!priceResult.success && !dividendResult.success) {
        return {
          success: false,
          error: 'Failed to fetch both price and dividend data'
        };
      }

      return {
        success: true,
        price: priceResult.data,
        dividends: dividendResult.data,
        error: !priceResult.success ? `Price: ${priceResult.error}` : 
               !dividendResult.success ? `Dividends: ${dividendResult.error}` : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Check API key validity
  static async validateApiKey(): Promise<boolean> {
    try {
      if (!this.API_KEY) return false;

      const response = await fetch(
        `${this.BASE_URL}/v2/aggs/ticker/AAPL/prev?adjusted=true&apikey=${this.API_KEY}`
      );

      return response.ok;
    } catch {
      return false;
    }
  }
}