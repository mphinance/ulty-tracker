export interface Investment {
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  costBasis: number;
  adjustedCostBasis: number;
  currentPrice: number;
  marketValue: number;
  capitalGainLoss: number;
  adjustedCapitalGainLoss: number;
  totalDividends: number;
  totalProfitLoss: number;
  adjustedTotalProfitLoss: number;
  roi: number;
  adjustedRoi: number;
  cumulativeROC: number;
  breakEvenPrice: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  amount: number;
}

export interface Dividend {
  id: string;
  payDate: string;
  distributionRate: number;
  shares: number;
  distributionAmount: number;
  rocPercentage: number;
  rocPortion: number;
  cumulativeROC: number;
  adjustedCostBasis: number;
  adjCostBasis: number;
  breakEvenPrice: number;
  isEstimated?: boolean;
}

export interface DividendData {
  date: string;
  amount: number;
  rocPercentage: number;
  isEstimated?: boolean;
}