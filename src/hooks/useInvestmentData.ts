import { useState, useEffect } from 'react';
import { Investment, Transaction, Dividend } from '../types/investment';
import { ALL_DIVIDENDS } from '../data/dividendSchedule';
import { SessionManager } from '../utils/sessionManager';
import { StorageManager } from '../utils/storageManager';
import { YahooDividendData } from '../services/dividendUpdateService';

const STORAGE_KEYS = {
  INVESTMENT: 'ulty_investment',
  TRANSACTIONS: 'ulty_transactions',
  DIVIDENDS: 'ulty_dividends',
  CURRENT_PRICE: 'ulty_current_price',
};

export const useInvestmentData = () => {
  const [sessionId, setSessionId] = useState<string>('');
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [isPortableMode, setIsPortableMode] = useState<boolean>(false);
  const [investment, setInvestment] = useState<Investment | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(6.23); // Default ULTY price

  // Calculate dividends based on transactions and their dates
  const calculateDividendsFromTransactions = (transactionList: Transaction[]) => {
    let cumulativeROC = 0;
    const sortedTransactions = [...transactionList].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return ALL_DIVIDENDS.map((div, index) => {
      const divDate = new Date(div.date);
      
      // Calculate shares owned at the time of this dividend
      // Only count transactions that occurred BEFORE the dividend date
      let sharesAtDivDate = 0;
      for (const transaction of sortedTransactions) {
        const transactionDate = new Date(transaction.date);
        if (transactionDate < divDate) { // Must own shares BEFORE dividend date
          sharesAtDivDate += transaction.type === 'buy' ? transaction.quantity : -transaction.quantity;
        }
      }
      
      // Only calculate dividend if we owned shares at that time
      const distributionAmount = sharesAtDivDate > 0 ? sharesAtDivDate * div.amount : 0;
      const rocPortion = distributionAmount * (div.rocPercentage / 100);
      cumulativeROC += rocPortion;
      
      // Calculate cost basis at this point in time
      let costBasisAtDivDate = 0;
      for (const transaction of sortedTransactions) {
        const transactionDate = new Date(transaction.date);
        if (transactionDate < divDate) {
          costBasisAtDivDate += transaction.type === 'buy' ? transaction.amount : -transaction.amount;
        }
      }
      
      const adjustedCostBasis = costBasisAtDivDate - cumulativeROC;
      const breakEvenPrice = sharesAtDivDate > 0 ? adjustedCostBasis / sharesAtDivDate : 0;

      return {
        id: `div-${index}`,
        payDate: div.date,
        distributionRate: div.amount,
        shares: sharesAtDivDate,
        distributionAmount: distributionAmount,
        rocPercentage: div.rocPercentage,
        rocPortion: rocPortion,
        cumulativeROC: cumulativeROC,
        adjustedCostBasis: adjustedCostBasis,
        adjCostBasis: breakEvenPrice,
        breakEvenPrice: breakEvenPrice,
        isEstimated: div.isEstimated || false,
      };
    });
  };

  // Calculate total dividends received based on transaction dates
  const calculateTotalDividendsReceived = (transactionList: Transaction[]) => {
    let totalDividends = 0;
    const sortedTransactions = [...transactionList].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (const div of ALL_DIVIDENDS) {
      const divDate = new Date(div.date);
      
      // Calculate shares owned at the time of this dividend
      // Only count transactions that occurred BEFORE the dividend date
      let sharesAtDivDate = 0;
      for (const transaction of sortedTransactions) {
        const transactionDate = new Date(transaction.date);
        if (transactionDate < divDate) { // Must own shares BEFORE dividend date
          sharesAtDivDate += transaction.type === 'buy' ? transaction.quantity : -transaction.quantity;
        }
      }
      
      // Only add dividend if we owned shares and the dividend has actually been paid
      if (sharesAtDivDate > 0 && new Date(div.date) <= new Date()) {
        totalDividends += sharesAtDivDate * div.amount;
      }
    }
    
    return totalDividends;
  };

  // Calculate cumulative ROC based on actual dividends received
  const calculateCumulativeROC = (transactionList: Transaction[]) => {
    let cumulativeROC = 0;
    const sortedTransactions = [...transactionList].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (const div of ALL_DIVIDENDS) {
      const divDate = new Date(div.date);
      
      // Calculate shares owned at the time of this dividend
      // Only count transactions that occurred BEFORE the dividend date
      let sharesAtDivDate = 0;
      for (const transaction of sortedTransactions) {
        const transactionDate = new Date(transaction.date);
        if (transactionDate < divDate) { // Must own shares BEFORE dividend date
          sharesAtDivDate += transaction.type === 'buy' ? transaction.quantity : -transaction.quantity;
        }
      }
      
      // Only add ROC if we owned shares and the dividend has actually been paid
      if (sharesAtDivDate > 0 && new Date(div.date) <= new Date()) {
        const distributionAmount = sharesAtDivDate * div.amount;
        const rocPortion = distributionAmount * (div.rocPercentage / 100);
        cumulativeROC += rocPortion;
      }
    }
    
    return cumulativeROC;
  };

  // Initialize session and data from localStorage or URL
  useEffect(() => {
    // Auto-cleanup storage if needed
    StorageManager.autoCleanupIfNeeded();

    // First check if we have portable data in the URL
    if (SessionManager.hasPortableData()) {
      const portableData = SessionManager.getPortableData();
      if (portableData) {
        setIsPortableMode(true);
        setIsReadOnly(true);
        setSessionId('portable');
        setCurrentPrice(portableData.currentPrice || 6.23);
        setInvestment(portableData.investment);
        setTransactions(portableData.transactions || []);
        setDividends(portableData.dividends || []);
        return;
      }
    }

    const currentSessionId = SessionManager.getOrCreateSessionId();
    const readOnlyMode = SessionManager.isReadOnlyMode();
    
    setSessionId(currentSessionId);
    setIsReadOnly(readOnlyMode);
    setIsPortableMode(false);

    if (readOnlyMode) {
      // Load read-only snapshot data
      const snapshot = SessionManager.getReadOnlySnapshot(currentSessionId);
      if (snapshot) {
        setCurrentPrice(snapshot.currentPrice || 6.23);
        setInvestment(snapshot.investment);
        setTransactions(snapshot.transactions || []);
        setDividends(snapshot.dividends || []);
      }
    } else {
      // Load current price
      const savedPrice = localStorage.getItem(
        SessionManager.getStorageKey(STORAGE_KEYS.CURRENT_PRICE, currentSessionId)
      );
      if (savedPrice) {
        setCurrentPrice(parseFloat(savedPrice));
      }

      // Load investment data
      const savedInvestment = localStorage.getItem(
        SessionManager.getStorageKey(STORAGE_KEYS.INVESTMENT, currentSessionId)
      );
      if (savedInvestment) {
        setInvestment(JSON.parse(savedInvestment));
      }

      // Load transactions
      const savedTransactions = localStorage.getItem(
        SessionManager.getStorageKey(STORAGE_KEYS.TRANSACTIONS, currentSessionId)
      );
      if (savedTransactions) {
        const loadedTransactions = JSON.parse(savedTransactions);
        setTransactions(loadedTransactions);
        
        // If we have transactions but no investment, calculate it
        if (!savedInvestment && loadedTransactions.length > 0) {
          updateInvestmentData(loadedTransactions, currentSessionId);
        }
      }

      // Load dividends
      const savedDividends = localStorage.getItem(
        SessionManager.getStorageKey(STORAGE_KEYS.DIVIDENDS, currentSessionId)
      );
      if (savedDividends) {
        setDividends(JSON.parse(savedDividends));
      }
    }
  }, []);

  // Save to localStorage whenever data changes (only if not read-only and not portable)
  useEffect(() => {
    if (sessionId && !isReadOnly && !isPortableMode) {
      const compressedData = StorageManager.compressData({ currentPrice });
      localStorage.setItem(
        SessionManager.getStorageKey(STORAGE_KEYS.CURRENT_PRICE, sessionId),
        compressedData
      );
    }
  }, [currentPrice, sessionId, isReadOnly, isPortableMode]);

  useEffect(() => {
    if (investment && sessionId && !isReadOnly && !isPortableMode) {
      const compressedData = StorageManager.compressData(investment);
      localStorage.setItem(
        SessionManager.getStorageKey(STORAGE_KEYS.INVESTMENT, sessionId),
        compressedData
      );
    }
  }, [investment, sessionId, isReadOnly, isPortableMode]);

  useEffect(() => {
    if (sessionId && !isReadOnly && !isPortableMode) {
      const compressedData = StorageManager.compressData(transactions);
      localStorage.setItem(
        SessionManager.getStorageKey(STORAGE_KEYS.TRANSACTIONS, sessionId),
        compressedData
      );
    }
  }, [transactions, sessionId, isReadOnly, isPortableMode]);

  useEffect(() => {
    if (sessionId && !isReadOnly && !isPortableMode) {
      const compressedData = StorageManager.compressData(dividends);
      localStorage.setItem(
        SessionManager.getStorageKey(STORAGE_KEYS.DIVIDENDS, sessionId),
        compressedData
      );
    }
  }, [dividends, sessionId, isReadOnly, isPortableMode]);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    if (isReadOnly || isPortableMode) return;
    
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
    };
    const updatedTransactions = [...transactions, newTransaction];
    updateInvestmentData(updatedTransactions, sessionId);
  };

  const updateTransaction = (id: string, updatedTransaction: Omit<Transaction, 'id'>) => {
    if (isReadOnly || isPortableMode) return;
    
    const updatedTransactions = transactions.map(t => 
      t.id === id ? { ...updatedTransaction, id } : t
    );
    updateInvestmentData(updatedTransactions, sessionId);
  };

  const removeTransaction = (id: string) => {
    if (isReadOnly || isPortableMode) return;
    
    const updatedTransactions = transactions.filter(t => t.id !== id);
    updateInvestmentData(updatedTransactions, sessionId);
  };

  const clearAllTransactions = () => {
    if (isReadOnly || isPortableMode) return;
    
    setTransactions([]);
    setInvestment(null);
    setDividends([]);
    
    // Clear session-specific localStorage (but keep current price)
    if (sessionId) {
      localStorage.removeItem(SessionManager.getStorageKey(STORAGE_KEYS.INVESTMENT, sessionId));
      localStorage.removeItem(SessionManager.getStorageKey(STORAGE_KEYS.TRANSACTIONS, sessionId));
      localStorage.removeItem(SessionManager.getStorageKey(STORAGE_KEYS.DIVIDENDS, sessionId));
    }
  };

  const updateHoldings = (shares: number, avgPrice: number) => {
    if (isReadOnly || isPortableMode) return;
    
    const costBasis = shares * avgPrice;
    
    // Clear existing transactions and create a new one based on the holdings
    const newTransaction: Transaction = {
      id: '1',
      date: new Date().toISOString().split('T')[0],
      type: 'buy',
      quantity: shares,
      price: avgPrice,
      amount: costBasis,
    };
    
    const updatedTransactions = [newTransaction];
    updateInvestmentData(updatedTransactions, sessionId);
  };

  const updateDividendData = (newDividends: YahooDividendData[], newCurrentPrice?: number) => {
    if (isReadOnly || isPortableMode) return;
    
    // Update current price if provided
    if (newCurrentPrice && newCurrentPrice > 0) {
      setCurrentPrice(newCurrentPrice);
    }
    
    // For now, we'll just trigger a recalculation with existing data
    // In a full implementation, you would merge the new dividend data with existing data
    if (transactions.length > 0) {
      updateInvestmentData(transactions, sessionId);
    }
    
    // TODO: Implement actual dividend data merging logic here
    // This would involve:
    // 1. Parsing the new dividend data
    // 2. Merging with existing dividend schedule
    // 3. Recalculating all dividend-related metrics
    console.log('New dividend data received:', newDividends);
  };

  const addTransactionsBatch = (newTransactions: Omit<Transaction, 'id'>[]) => {
    if (isReadOnly || isPortableMode) return { success: false, error: 'Cannot import in read-only mode' };
    
    try {
      // Add IDs to new transactions
      const transactionsWithIds: Transaction[] = newTransactions.map((transaction, index) => ({
        ...transaction,
        id: `${Date.now()}-${index}`,
      }));
      
      // Combine with existing transactions
      const updatedTransactions = [...transactions, ...transactionsWithIds];
      
      // Update investment data with all transactions
      updateInvestmentData(updatedTransactions, sessionId);
      
      return { success: true, count: newTransactions.length };
    } catch (error) {
      return { success: false, error: 'Failed to import transactions' };
    }
  };

  const updateInvestmentData = (updatedTransactions: Transaction[], currentSessionId: string = sessionId) => {
    if (isReadOnly || isPortableMode) return;
    
    setTransactions(updatedTransactions);

    if (updatedTransactions.length === 0) {
      setInvestment(null);
      setDividends([]);
      return;
    }

    // Recalculate investment data
    const totalShares = updatedTransactions.reduce((sum, t) => 
      sum + (t.type === 'buy' ? t.quantity : -t.quantity), 0
    );
    
    const totalCost = updatedTransactions.reduce((sum, t) => 
      sum + (t.type === 'buy' ? t.amount : -t.amount), 0
    );

    const avgPrice = totalShares > 0 ? totalCost / totalShares : 0;
    const marketValue = totalShares * currentPrice;
    const capitalGainLoss = marketValue - totalCost;

    // Recalculate dividends with new transaction history
    const updatedDividends = calculateDividendsFromTransactions(updatedTransactions);
    setDividends(updatedDividends);

    // Calculate total dividends received and cumulative ROC based on transaction dates
    const totalDividendsReceived = calculateTotalDividendsReceived(updatedTransactions);
    const cumulativeROC = calculateCumulativeROC(updatedTransactions);
    const adjustedCostBasis = totalCost - cumulativeROC;
    const adjustedCapitalGainLoss = marketValue - adjustedCostBasis;

    // Fix the Adjusted Total P&L calculation - don't double count ROC
    const nonROCDividends = totalDividendsReceived - cumulativeROC;
    const adjustedTotalProfitLoss = adjustedCapitalGainLoss + nonROCDividends;

    const newInvestment: Investment = {
      symbol: 'ULTY',
      name: 'ULTY',
      shares: totalShares,
      avgPrice,
      costBasis: totalCost,
      adjustedCostBasis,
      currentPrice,
      marketValue,
      capitalGainLoss,
      adjustedCapitalGainLoss,
      totalDividends: totalDividendsReceived,
      totalProfitLoss: capitalGainLoss + totalDividendsReceived,
      adjustedTotalProfitLoss,
      roi: totalCost > 0 ? (capitalGainLoss + totalDividendsReceived) / totalCost * 100 : 0,
      adjustedRoi: adjustedCostBasis > 0 ? adjustedTotalProfitLoss / adjustedCostBasis * 100 : 0,
      cumulativeROC,
      breakEvenPrice: totalShares > 0 ? adjustedCostBasis / totalShares : 0,
    };

    setInvestment(newInvestment);
  };

  const updateCurrentPrice = (newPrice: number) => {
    if (isReadOnly || isPortableMode) return;
    
    setCurrentPrice(newPrice);
    
    if (investment) {
      const marketValue = investment.shares * newPrice;
      const capitalGainLoss = marketValue - investment.costBasis;
      const adjustedCapitalGainLoss = marketValue - investment.adjustedCostBasis;
      const totalProfitLoss = capitalGainLoss + investment.totalDividends;
      
      // Fix the Adjusted Total P&L calculation here too
      const nonROCDividends = investment.totalDividends - investment.cumulativeROC;
      const adjustedTotalProfitLoss = adjustedCapitalGainLoss + nonROCDividends;
      
      const roi = investment.costBasis > 0 ? (totalProfitLoss / investment.costBasis) * 100 : 0;
      const adjustedRoi = investment.adjustedCostBasis > 0 ? (adjustedTotalProfitLoss / investment.adjustedCostBasis) * 100 : 0;

      setInvestment(prev => prev ? {
        ...prev,
        currentPrice: newPrice,
        marketValue,
        capitalGainLoss,
        adjustedCapitalGainLoss,
        totalProfitLoss,
        adjustedTotalProfitLoss,
        roi,
        adjustedRoi,
      } : null);
    }
  };

  const createNewSession = () => {
    if (isReadOnly || isPortableMode) return '';
    
    const newSessionId = SessionManager.createNewSession();
    setSessionId(newSessionId);
    
    // Clear current data but keep the current price
    setTransactions([]);
    setInvestment(null);
    setDividends([]);
    
    return newSessionId;
  };

  const getShareableURL = () => {
    return SessionManager.getShareableURL();
  };

  const getReadOnlyShareableURL = () => {
    if (isReadOnly || isPortableMode) return window.location.href;
    
    // Create a snapshot of current portfolio data
    const portfolioSnapshot = {
      investment,
      transactions,
      dividends,
      currentPrice,
    };
    
    return SessionManager.createReadOnlyURL(sessionId, portfolioSnapshot);
  };

  const getPortableURL = () => {
    // Create a fully portable URL with embedded data
    const portfolioData = {
      investment,
      transactions,
      dividends,
      currentPrice,
    };
    
    return SessionManager.createPortableURL(portfolioData);
  };

  return {
    sessionId,
    isReadOnly: isReadOnly || isPortableMode,
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
  };
};