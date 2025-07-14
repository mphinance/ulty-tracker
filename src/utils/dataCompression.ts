// Data compression utilities for reducing URL and storage size
export class DataCompression {
  // Compress portfolio data for URLs (aggressive compression)
  static compressForURL(data: any): string {
    try {
      // Remove unnecessary fields and compress structure
      const compressed = {
        i: data.investment ? {
          s: data.investment.shares,
          ap: data.investment.avgPrice,
          cp: data.investment.currentPrice,
          cb: data.investment.costBasis,
          acb: data.investment.adjustedCostBasis,
          mv: data.investment.marketValue,
          td: data.investment.totalDividends,
          cr: data.investment.cumulativeROC,
          bp: data.investment.breakEvenPrice
        } : null,
        t: data.transactions?.map((t: any) => [
          t.date,
          t.type === 'buy' ? 1 : 0,
          t.quantity,
          t.price
        ]) || [],
        cp: data.currentPrice || 6.23,
        ts: Date.now() // timestamp
      };
      
      const jsonString = JSON.stringify(compressed);
      return btoa(encodeURIComponent(jsonString));
    } catch (error) {
      console.error('Error compressing data for URL:', error);
      return '';
    }
  }

  // Decompress portfolio data from URLs
  static decompressFromURL(encodedData: string): any | null {
    try {
      const jsonString = decodeURIComponent(atob(encodedData));
      const compressed = JSON.parse(jsonString);
      
      // Reconstruct full data structure
      const decompressed = {
        investment: compressed.i ? {
          symbol: 'ULTY',
          name: 'ULTY',
          shares: compressed.i.s,
          avgPrice: compressed.i.ap,
          currentPrice: compressed.i.cp,
          costBasis: compressed.i.cb,
          adjustedCostBasis: compressed.i.acb,
          marketValue: compressed.i.mv,
          capitalGainLoss: compressed.i.mv - compressed.i.cb,
          adjustedCapitalGainLoss: compressed.i.mv - compressed.i.acb,
          totalDividends: compressed.i.td,
          totalProfitLoss: (compressed.i.mv - compressed.i.cb) + compressed.i.td,
          adjustedTotalProfitLoss: (compressed.i.mv - compressed.i.acb) + (compressed.i.td - compressed.i.cr),
          roi: compressed.i.cb > 0 ? (((compressed.i.mv - compressed.i.cb) + compressed.i.td) / compressed.i.cb) * 100 : 0,
          adjustedRoi: compressed.i.acb > 0 ? (((compressed.i.mv - compressed.i.acb) + (compressed.i.td - compressed.i.cr)) / compressed.i.acb) * 100 : 0,
          cumulativeROC: compressed.i.cr,
          breakEvenPrice: compressed.i.bp
        } : null,
        transactions: compressed.t?.map((t: any, index: number) => ({
          id: index.toString(),
          date: t[0],
          type: t[1] === 1 ? 'buy' : 'sell',
          quantity: t[2],
          price: t[3],
          amount: t[2] * t[3]
        })) || [],
        currentPrice: compressed.cp,
        dividends: [], // Will be recalculated
        createdAt: new Date(compressed.ts).toISOString()
      };
      
      return decompressed;
    } catch (error) {
      console.error('Error decompressing data from URL:', error);
      return null;
    }
  }

  // Check if URL would be too long
  static wouldURLBeTooLong(data: any, baseURL: string = window.location.origin): boolean {
    const compressed = this.compressForURL(data);
    const fullURL = `${baseURL}?data=${compressed}`;
    return fullURL.length > 1900; // Conservative limit
  }

  // Get estimated URL length
  static getEstimatedURLLength(data: any, baseURL: string = window.location.origin): number {
    const compressed = this.compressForURL(data);
    return `${baseURL}?data=${compressed}`.length;
  }
}