import React, { useState } from 'react';
import { Investment } from '../types/investment';
import { TrendingUp, TrendingDown, DollarSign, Percent, Edit2, Save, X, Target } from 'lucide-react';
import { PriceUpdater } from './PriceUpdater';

interface InvestmentSummaryProps {
  investment: Investment | null;
  onPriceUpdate: (price: number) => void;
  onHoldingsUpdate?: (shares: number, avgPrice: number) => void;
  currentPrice: number;
  isReadOnly?: boolean;
}

export const InvestmentSummary: React.FC<InvestmentSummaryProps> = ({
  investment,
  onPriceUpdate,
  onHoldingsUpdate,
  currentPrice,
  isReadOnly = false,
}) => {
  const [isEditingHoldings, setIsEditingHoldings] = useState(false);
  const [editHoldings, setEditHoldings] = useState({
    shares: investment?.shares || 0,
    avgPrice: investment?.avgPrice || 0,
  });

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);

  const formatPercentage = (percent: number) => 
    `${percent.toFixed(2)}%`;

  const isPositive = (value: number) => value >= 0;

  const handleSaveHoldings = () => {
    if (onHoldingsUpdate && !isReadOnly) {
      onHoldingsUpdate(editHoldings.shares, editHoldings.avgPrice);
    }
    setIsEditingHoldings(false);
  };

  const handleCancelEdit = () => {
    setEditHoldings({
      shares: investment?.shares || 0,
      avgPrice: investment?.avgPrice || 0,
    });
    setIsEditingHoldings(false);
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">ULTY</h1>
          <p className="text-gray-400">
            Investment Portfolio {isReadOnly && <span className="text-purple-400">(Read-Only)</span>}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-right mr-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Current ULTY Price
            </label>
            <p className="text-xs text-gray-400">Market price (15min delayed)</p>
          </div>
          <PriceUpdater
            currentPrice={currentPrice}
            onPriceUpdate={onPriceUpdate}
            isReadOnly={isReadOnly}
            symbol="ULTY"
          />
        </div>
      </div>

      {investment && (
        <>
          {/* Breakeven Price Highlight - New prominent section */}
          <div className="mb-6 p-6 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 rounded-xl border-2 border-purple-600/50 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 bg-purple-500/20 rounded-full mr-4">
                  <Target className="h-8 w-8 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-purple-200 mb-1">Breakeven Price Target</h3>
                  <p className="text-sm text-purple-300/80">
                    Adjusted cost basis per share after ROC reductions
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-purple-100 mb-1">
                  {formatCurrency(investment.breakEvenPrice)}
                </div>
                <div className="text-sm text-purple-300">
                  vs Current: {formatCurrency(investment.currentPrice)}
                </div>
                <div className={`text-sm font-medium ${
                  investment.currentPrice >= investment.breakEvenPrice 
                    ? 'text-green-300' 
                    : 'text-red-300'
                }`}>
                  {investment.currentPrice >= investment.breakEvenPrice ? '✓ Above' : '⚠ Below'} Breakeven
                </div>
              </div>
            </div>
            
            {/* Progress bar showing current price vs breakeven */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-purple-300 mb-1">
                <span>$0</span>
                <span>Breakeven: {formatCurrency(investment.breakEvenPrice)}</span>
                <span>Current: {formatCurrency(investment.currentPrice)}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-indigo-400 h-2 rounded-full relative"
                  style={{ 
                    width: `${Math.min((investment.breakEvenPrice / Math.max(investment.currentPrice, investment.breakEvenPrice)) * 100, 100)}%` 
                  }}
                >
                  {/* Current price indicator */}
                  <div 
                    className="absolute top-0 w-1 h-2 bg-white rounded-full shadow-lg"
                    style={{ 
                      left: `${Math.min((investment.currentPrice / Math.max(investment.currentPrice, investment.breakEvenPrice)) * 100, 100)}%`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Shares & Cost Basis */}
            <div className="space-y-4">
              <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-800">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-medium text-blue-300">Total Shares</h3>
                  {!isEditingHoldings && onHoldingsUpdate && !isReadOnly && (
                    <button
                      onClick={() => setIsEditingHoldings(true)}
                      className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-900/50 rounded transition-colors"
                      title="Edit holdings"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {isEditingHoldings && !isReadOnly ? (
                  <div className="space-y-2">
                    <input
                      type="number"
                      step="1"
                      value={editHoldings.shares || ''}
                      onChange={(e) => setEditHoldings({ ...editHoldings, shares: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 text-lg font-bold bg-gray-700 border border-gray-600 rounded text-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Shares"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={handleSaveHoldings}
                        className="flex-1 flex items-center justify-center px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-2 py-1 bg-gray-600 text-gray-200 text-xs rounded hover:bg-gray-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-blue-100">{investment.shares.toLocaleString()}</p>
                )}
              </div>
              <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-800">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-medium text-yellow-300">Average Price</h3>
                </div>
                {isEditingHoldings && !isReadOnly ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editHoldings.avgPrice || ''}
                    onChange={(e) => setEditHoldings({ ...editHoldings, avgPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-lg font-semibold bg-gray-600 border border-gray-500 rounded text-yellow-100 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                    placeholder="Avg Price"
                  />
                ) : (
                  <p className="text-xl font-semibold text-yellow-100">{formatCurrency(investment.avgPrice)}</p>
                )}
              </div>
            </div>

            {/* Cost Basis */}
            <div className="space-y-4">
              <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-800">
                <h3 className="text-sm font-medium text-purple-300 mb-1">Original Cost Basis</h3>
                <p className="text-xl font-semibold text-purple-100">{formatCurrency(investment.costBasis)}</p>
              </div>
              <div className="p-4 bg-purple-900/40 rounded-lg border-2 border-purple-700">
                <h3 className="text-sm font-medium text-purple-300 mb-1">Adjusted Cost Basis</h3>
                <p className="text-xl font-semibold text-purple-100">{formatCurrency(investment.adjustedCostBasis)}</p>
                <p className="text-xs text-purple-300 mt-1">After ROC: {formatCurrency(investment.cumulativeROC)}</p>
              </div>
            </div>

            {/* Market Value & P&L */}
            <div className="space-y-4">
              <div className="p-4 bg-green-900/30 rounded-lg border border-green-800">
                <h3 className="text-sm font-medium text-green-300 mb-1">Market Value</h3>
                <p className="text-xl font-semibold text-green-100">{formatCurrency(investment.marketValue)}</p>
              </div>
              <div className={`p-4 rounded-lg border ${isPositive(investment.capitalGainLoss) ? 'bg-green-900/30 border-green-800' : 'bg-red-900/30 border-red-800'}`}>
                <h3 className={`text-sm font-medium mb-1 ${isPositive(investment.capitalGainLoss) ? 'text-green-300' : 'text-red-300'}`}>
                  Capital Gain/Loss
                </h3>
                <div className="flex items-center">
                  {isPositive(investment.capitalGainLoss) ? 
                    <TrendingUp className="h-5 w-5 text-green-400 mr-1" /> : 
                    <TrendingDown className="h-5 w-5 text-red-400 mr-1" />
                  }
                  <p className={`text-xl font-semibold ${isPositive(investment.capitalGainLoss) ? 'text-green-100' : 'text-red-100'}`}>
                    {formatCurrency(investment.capitalGainLoss)}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Returns */}
            <div className="space-y-4">
              <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-800">
                <h3 className="text-sm font-medium text-purple-300 mb-1">Total Dividends</h3>
                <p className="text-xl font-semibold text-purple-100">{formatCurrency(investment.totalDividends)}</p>
              </div>
              <div className={`p-4 rounded-lg border ${isPositive(investment.adjustedTotalProfitLoss) ? 'bg-green-900/30 border-green-800' : 'bg-red-900/30 border-red-800'}`}>
                <h3 className={`text-sm font-medium mb-1 ${isPositive(investment.adjustedTotalProfitLoss) ? 'text-green-300' : 'text-red-300'}`}>
                  Adjusted Total P&L
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {isPositive(investment.adjustedTotalProfitLoss) ? 
                      <TrendingUp className="h-5 w-5 text-green-400 mr-1" /> : 
                      <TrendingDown className="h-5 w-5 text-red-400 mr-1" />
                    }
                    <p className={`text-xl font-semibold ${isPositive(investment.adjustedTotalProfitLoss) ? 'text-green-100' : 'text-red-100'}`}>
                      {formatCurrency(investment.adjustedTotalProfitLoss)}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Percent className="h-4 w-4 text-gray-400 mr-1" />
                    <span className={`text-sm font-medium ${isPositive(investment.adjustedRoi) ? 'text-green-300' : 'text-red-300'}`}>
                      {formatPercentage(investment.adjustedRoi)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isEditingHoldings && !isReadOnly && (
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
              <p className="text-sm text-blue-200">
                <strong>Note:</strong> Editing holdings will recalculate all investment metrics and dividend projections based on the new share count and average price.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};