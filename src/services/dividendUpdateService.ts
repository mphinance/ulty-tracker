// Service to fetch dividend data from Yahoo Finance
import { PolygonService, PolygonDividendData } from './polygonService';

export interface YahooDividendData {
  date: string;
  amount: number;
}

export class DividendUpdateService {
  private static readonly YAHOO_FINANCE_URL = 'https://finance.yahoo.com/quote/ULTY/history/?filter=div';

  // Fetch dividend data from Polygon.io API
  static async fetchLatestDividends(symbol: string = 'ULTY'): Promise<{
    success: boolean;
    data?: YahooDividendData[];
    currentPrice?: number;
    error?: string;
  }> {
    try {
      // Get both price and dividend data from Polygon
      const result = await PolygonService.getStockData(symbol);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to fetch data from Polygon.io'
        };
      }

      // Convert Polygon dividend format to our format
      const dividends: YahooDividendData[] = result.dividends?.map(div => ({
        date: div.paymentDate || div.exDividendDate,
        amount: div.amount
      })) || [];

      return {
        success: true,
        data: dividends,
        currentPrice: result.price?.price
      };
    } catch (error) {
      return {
        success: false,
        error: 'Network error: ' + (error as Error).message
      };
    }
  }

  // Helper to validate dividend data format
  static validateDividendData(data: any[]): YahooDividendData[] {
    return data.filter(item => 
      item.date && 
      item.amount && 
      !isNaN(parseFloat(item.amount)) &&
      new Date(item.date).toString() !== 'Invalid Date'
    ).map(item => ({
      date: new Date(item.date).toISOString().split('T')[0],
      amount: parseFloat(item.amount)
    }));
  }

  // Format date for Yahoo Finance compatibility
  static formatDateForYahoo(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Parse dividend amount from various formats
  static parseDividendAmount(amountStr: string): number {
    // Remove currency symbols and parse
    const cleaned = amountStr.replace(/[$,\s]/g, '');
    return parseFloat(cleaned) || 0;
  }
}