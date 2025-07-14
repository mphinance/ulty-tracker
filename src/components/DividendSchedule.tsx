import React, { useState } from 'react';
import { Dividend, Transaction } from '../types/investment';
import { Calendar, DollarSign, TrendingDown, Sparkles, ChevronDown, ChevronUp, BarChart3, Star, RefreshCw } from 'lucide-react';
import { DividendUpdateModal } from './DividendUpdateModal';
import { YahooDividendData } from '../services/dividendUpdateService';

interface DividendScheduleProps {
  dividends: Dividend[];
  transactions: Transaction[];
  isReadOnly?: boolean;
  onUpdateDividends?: (dividends: YahooDividendData[], currentPrice?: number) => void;
  currentPrice: number;
}

export const DividendSchedule: React.FC<DividendScheduleProps> = ({ 
  dividends, 
  transactions, 
  isReadOnly = false,
  onUpdateDividends,
  currentPrice
}) => {
  const [isExpanded, setIsExpanded] = useState(isReadOnly); // Auto-expand in read-only mode
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isPastDate = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  const getNextPaymentIndex = () => {
    const today = new Date();
    return dividends.findIndex(div => new Date(div.payDate) > today);
  };

  const nextPaymentIndex = getNextPaymentIndex();

  // Separate actual and estimated dividends for summary calculations
  const actualDividends = dividends.filter(div => !div.isEstimated);
  const estimatedDividends = dividends.filter(div => div.isEstimated);

  // Get summary data
  const actualTotal = actualDividends.reduce((sum, div) => sum + div.distributionAmount, 0);
  const estimatedTotal = estimatedDividends.reduce((sum, div) => sum + div.distributionAmount, 0);
  const totalROC = dividends[dividends.length - 1]?.cumulativeROC || 0;
  const finalBreakeven = dividends[dividends.length - 1]?.breakEvenPrice || 0;

  // Calculate portfolio summary at each dividend point
  const createPortfolioSummary = () => {
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return dividends.map((dividend, index) => {
      const divDate = new Date(dividend.payDate);
      
      // Calculate shares and cost basis at this dividend date
      let sharesAtDate = 0;
      let costBasisAtDate = 0;
      
      for (const transaction of sortedTransactions) {
        const transactionDate = new Date(transaction.date);
        if (transactionDate < divDate) {
          sharesAtDate += transaction.type === 'buy' ? transaction.quantity : -transaction.quantity;
          costBasisAtDate += transaction.type === 'buy' ? transaction.amount : -transaction.amount;
        }
      }
      
      const avgPrice = sharesAtDate > 0 ? costBasisAtDate / sharesAtDate : 0;
      
      return {
        ...dividend,
        portfolioShares: sharesAtDate,
        portfolioCostBasis: costBasisAtDate,
        portfolioAvgPrice: avgPrice,
      };
    });
  };

  const portfolioSummary = createPortfolioSummary();

  const handleUpdateDividends = (newDividends: YahooDividendData[], newCurrentPrice?: number) => {
    if (onUpdateDividends) {
      onUpdateDividends(newDividends, newCurrentPrice);
    }
    setShowUpdateModal(false);
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Calendar className="h-6 w-6 text-blue-400 mr-2" />
          <h2 className="text-2xl font-bold text-white">
            2025 Dividend Schedule
            {isReadOnly && (
              <span className="ml-2 text-sm font-normal text-purple-300">(Portfolio Report)</span>
            )}
          </h2>
          <div className="ml-4 flex items-center text-sm text-gray-400">
            <Sparkles className="h-4 w-4 mr-1" />
            <span>* Estimated based on 6-week average</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {!isReadOnly && onUpdateDividends && (
            <button
              onClick={() => setShowUpdateModal(true)}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              title="Update dividend data from Polygon.io API"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Fetch Latest Data
            </button>
          )}
          {!isReadOnly && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Show Details
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards - Always Visible */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-green-900/40 rounded-lg border-2 border-green-700 shadow-lg">
          <div className="flex items-center mb-2">
            <Star className="h-5 w-5 text-green-400 mr-2" />
            <h3 className="text-sm font-medium text-green-300">Actual Dividends</h3>
          </div>
          <p className="text-xl font-bold text-green-100">
            {formatCurrency(actualTotal)}
          </p>
          <p className="text-xs text-green-300 mt-1">Confirmed payments received</p>
        </div>
        <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-800">
          <h3 className="text-sm font-medium text-purple-300 mb-1">Estimated Dividends</h3>
          <p className="text-xl font-bold text-purple-100">
            {formatCurrency(estimatedTotal)}
          </p>
        </div>
        <div className="p-4 bg-red-900/30 rounded-lg border border-red-800">
          <h3 className="text-sm font-medium text-red-300 mb-1">Total ROC Impact</h3>
          <p className="text-xl font-bold text-red-100">
            {formatCurrency(totalROC)}
          </p>
        </div>
        <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-800">
          <h3 className="text-sm font-medium text-purple-300 mb-1">Final Breakeven</h3>
          <p className="text-xl font-bold text-purple-100">
            {formatCurrency(finalBreakeven)}
          </p>
        </div>
      </div>

      {/* Detailed Table - Collapsible or Always Visible in Read-Only */}
      {isExpanded && (
        <div className="space-y-6">
          {/* Portfolio Summary Header */}
          <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
            <div className="flex items-center mb-2">
              <BarChart3 className="h-5 w-5 text-blue-400 mr-2" />
              <h3 className="text-lg font-semibold text-blue-200">Portfolio Evolution</h3>
            </div>
            <p className="text-sm text-blue-300">
              Track how your holdings and cost basis change with each dividend payment
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-3 px-2 font-medium text-gray-300">Date</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-300">Event</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-300">Rate</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-300">Portfolio Shares</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-300">Avg Price</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-300">Cost Basis</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-300">Dividend Amount</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-300">ROC %</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-300">ROC Portion</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-300">Cumulative ROC</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-300">Adj. Cost Basis</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-300">Breakeven Price</th>
                </tr>
              </thead>
              <tbody>
                {portfolioSummary.map((row, index) => {
                  const isPast = isPastDate(row.payDate);
                  const isNext = index === nextPaymentIndex;
                  const isEstimated = row.isEstimated;
                  const isActual = !isEstimated && isPast;
                  
                  return (
                    <tr 
                      key={row.id}
                      className={`border-b border-gray-700 hover:bg-gray-700/50 transition-colors ${
                        isNext ? 'bg-blue-900/30 border-blue-700' : ''
                      } ${isPast && !isActual ? 'opacity-60' : ''} ${
                        isEstimated ? 'bg-purple-900/20' : ''
                      } ${isActual ? 'bg-green-900/20 border-green-800' : ''}`}
                    >
                      <td className="py-3 px-2 text-gray-200">
                        <div className="flex items-center">
                          {isNext && <div className="w-2 h-2 bg-blue-400 rounded-full mr-2" />}
                          {isActual && <Star className="h-3 w-3 text-green-400 mr-1" />}
                          {isEstimated && <Sparkles className="h-3 w-3 text-purple-400 mr-1" />}
                          <span className={`${
                            isNext ? 'font-semibold text-blue-200' : 
                            isActual ? 'font-medium text-green-200' :
                            isEstimated ? 'text-purple-200' : 'text-gray-200'
                          }`}>
                            {formatDate(row.payDate)}
                            {isEstimated && '*'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center">
                          <Calendar className={`h-3 w-3 mr-1 ${
                            isActual ? 'text-green-400' :
                            isEstimated ? 'text-purple-400' : 'text-blue-400'
                          }`} />
                          <span className={`text-xs font-medium ${
                            isActual ? 'text-green-300' :
                            isEstimated ? 'text-purple-300' : 'text-blue-300'
                          }`}>
                            Dividend
                          </span>
                        </div>
                      </td>
                      <td className={`py-3 px-2 text-right ${
                        isActual ? 'text-green-200' :
                        isEstimated ? 'text-purple-200' : 'text-gray-200'
                      }`}>
                        {formatCurrency(row.distributionRate)}
                      </td>
                      <td className="py-3 px-2 text-right text-blue-200 font-medium">
                        {row.portfolioShares.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right text-gray-200">
                        {formatCurrency(row.portfolioAvgPrice)}
                      </td>
                      <td className="py-3 px-2 text-right text-purple-200">
                        {formatCurrency(row.portfolioCostBasis)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end">
                          <DollarSign className={`h-4 w-4 mr-1 ${
                            isActual ? 'text-green-400' :
                            isEstimated ? 'text-purple-400' : 'text-green-400'
                          }`} />
                          <span className={`font-medium ${
                            isActual ? 'text-green-300 font-bold' :
                            isEstimated ? 'text-purple-300' : 'text-green-300'
                          }`}>
                            {formatCurrency(row.distributionAmount)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          isActual ? 'bg-green-900/50 text-green-300 border-green-800' :
                          isEstimated ? 'bg-purple-900/50 text-purple-300 border-purple-800' : 'bg-red-900/50 text-red-300 border-red-800'
                        }`}>
                          {row.rocPercentage}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end">
                          <TrendingDown className={`h-4 w-4 mr-1 ${
                            isActual ? 'text-green-400' :
                            isEstimated ? 'text-purple-400' : 'text-red-400'
                          }`} />
                          <span className={`font-medium ${
                            isActual ? 'text-green-300' :
                            isEstimated ? 'text-purple-300' : 'text-red-300'
                          }`}>
                            {formatCurrency(row.rocPortion)}
                          </span>
                        </div>
                      </td>
                      <td className={`py-3 px-2 text-right font-medium ${
                        isActual ? 'text-green-300' :
                        isEstimated ? 'text-purple-300' : 'text-purple-300'
                      }`}>
                        {formatCurrency(row.cumulativeROC)}
                      </td>
                      <td className={`py-3 px-2 text-right font-medium ${
                        isActual ? 'text-green-300' :
                        isEstimated ? 'text-purple-300' : 'text-purple-300'
                      }`}>
                        {formatCurrency(row.adjustedCostBasis)}
                      </td>
                      <td className={`py-3 px-2 text-right font-medium ${
                        isActual ? 'text-green-200' :
                        isEstimated ? 'text-purple-300' : 'text-purple-200'
                      }`}>
                        {formatCurrency(row.breakEvenPrice)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
            <p className="text-sm text-blue-200">
              <strong>Portfolio Evolution:</strong> This table shows how your portfolio changes with each dividend payment. 
              The Portfolio Shares, Avg Price, and Cost Basis columns show your holdings at the time of each dividend, 
              while the ROC adjustments progressively reduce your cost basis and breakeven price.
            </p>
          </div>
        </div>
      )}

      {/* Update Modal */}
      <DividendUpdateModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onUpdateDividends={handleUpdateDividends}
        currentPrice={currentPrice}
      />
    </div>
  );
};