import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useInvestmentData } from './hooks/useInvestmentData';
import { InvestmentSummary } from './components/InvestmentSummary';
import { DividendSchedule } from './components/DividendSchedule';
import { TransactionHistory } from './components/TransactionHistory';
import { SessionManager } from './components/SessionManager';
import { PieChart, TrendingUp, EyeOff, Link } from 'lucide-react';

function App() {
  const { 
    sessionId,
    isReadOnly,
    isPortableMode,
    investment, 
    transactions, 
    dividends, 
    currentPrice,
    addTransaction, 
    updateTransaction, 
    removeTransaction,
    clearAllTransactions,
    updateCurrentPrice,
    updateHoldings,
    createNewSession,
    getShareableURL,
    getReadOnlyShareableURL,
    getPortableURL,
    updateDividendData,
    addTransactionsBatch,
  } = useInvestmentData();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <header className="bg-gray-800 shadow-lg border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <PieChart className="h-8 w-8 text-blue-400 mr-3" />
                <div>
                  <h1 className="text-xl font-bold text-white">
                    ULTY Investment Tracker
                    {isPortableMode && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-800">
                        <Link className="h-3 w-3 mr-1" />
                        Portable Link
                      </span>
                    )}
                    {isReadOnly && !isPortableMode && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-900/50 text-purple-300 border border-purple-800">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Portfolio Report
                      </span>
                    )}
                  </h1>
                  <p className="text-sm text-gray-400">
                    Portfolio Management & ROC Tracking
                    {isPortableMode && <span className="text-green-400"> • Self-Contained Data</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <TrendingUp className="h-4 w-4" />
                  <span>Real-time Portfolio Analysis</span>
                </div>
                <SessionManager
                  sessionId={sessionId}
                  isReadOnly={isReadOnly}
                  isPortableMode={isPortableMode}
                  onCreateNewSession={createNewSession}
                  getShareableURL={getShareableURL}
                  getReadOnlyShareableURL={getReadOnlyShareableURL}
                  getPortableURL={getPortableURL}
                  investment={investment}
                  transactions={transactions}
                  dividends={dividends}
                  currentPrice={currentPrice}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Investment Summary - Always show, even without investment data */}
            <InvestmentSummary 
              investment={investment}
              currentPrice={currentPrice}
              onPriceUpdate={updateCurrentPrice}
              onHoldingsUpdate={updateHoldings}
              isReadOnly={isReadOnly}
            />

            {/* Transaction History - Hidden in read-only mode */}
            {!isReadOnly && (
              <TransactionHistory 
                transactions={transactions}
                onAddTransaction={addTransaction}
                onUpdateTransaction={updateTransaction}
                onRemoveTransaction={removeTransaction}
                onClearAll={clearAllTransactions}
                onImportTransactions={addTransactionsBatch}
              />
            )}

            {/* Dividend Schedule */}
            {dividends.length > 0 && (
              <DividendSchedule 
                dividends={dividends} 
                transactions={transactions}
                isReadOnly={isReadOnly}
                onUpdateDividends={updateDividendData}
                currentPrice={currentPrice}
              />
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 border-t border-gray-700 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center text-sm text-gray-400">
              <p>Investment tracking for ULTY with automatic cost basis adjustments</p>
              <p className="mt-1">
                Data updates in real-time • ROC calculations included • Session: {sessionId}
                {isReadOnly && <span className="text-purple-400"> • Portfolio Report Mode</span>}
                {isPortableMode && <span className="text-green-400"> • Portable Data Mode</span>}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;