import React, { useState } from 'react';
import Papa from 'papaparse';
import { Transaction } from '../types/investment';
import { Plus, TrendingUp, TrendingDown, Calendar, Edit2, Trash2, Save, X, RefreshCw, Upload, CheckCircle, AlertCircle, Download } from 'lucide-react';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (id: string, transaction: Omit<Transaction, 'id'>) => void;
  onRemoveTransaction: (id: string) => void;
  onClearAll: () => void;
  onImportTransactions?: (transactions: Omit<Transaction, 'id'>[]) => { success: boolean; count?: number; error?: string };
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  onAddTransaction,
  onUpdateTransaction,
  onRemoveTransaction,
  onClearAll,
  onImportTransactions,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCsvInput, setShowCsvInput] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [isImporting, setIsImporting] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'buy' as 'buy' | 'sell',
    quantity: 0,
    price: 0,
  });

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);

  const formatDate = (dateString: string) => {
    // Create date object and ensure it's interpreted as local date
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC' // Force UTC to prevent timezone shifts
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = formData.quantity * formData.price;
    
    if (editingId) {
      onUpdateTransaction(editingId, { ...formData, amount });
      setEditingId(null);
    } else {
      onAddTransaction({ ...formData, amount });
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'buy',
      quantity: 0,
      price: 0,
    });
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (transaction: Transaction) => {
    setFormData({
      date: transaction.date,
      type: transaction.type,
      quantity: transaction.quantity,
      price: transaction.price,
    });
    setEditingId(transaction.id);
    setShowForm(true);
  };

  const handleRemove = (id: string) => {
    if (window.confirm('Are you sure you want to remove this transaction?')) {
      onRemoveTransaction(id);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to remove ALL transactions? This will reset your entire portfolio.')) {
      onClearAll();
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setImportStatus({
        type: 'error',
        message: 'Please select a CSV file'
      });
      return;
    }

    processCsvData(file);
  };

  const handleTextImport = () => {
    if (!csvText.trim()) {
      setImportStatus({
        type: 'error',
        message: 'Please enter CSV data'
      });
      return;
    }

    // Create a blob from the text and process it like a file
    const blob = new Blob([csvText], { type: 'text/csv' });
    processCsvData(blob);
  };

  const processCsvData = (data: File | Blob) => {
    setIsImporting(true);
    setImportStatus({ type: null, message: '' });

    Papa.parse(data, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const validTransactions: Omit<Transaction, 'id'>[] = [];
          const errors: string[] = [];

          results.data.forEach((row: any, index: number) => {
            const rowNumber = index + 2; // +2 because index starts at 0 and we have a header row

            // Validate required fields
            if (!row.date || !row.type || !row.quantity || !row.price) {
              errors.push(`Row ${rowNumber}: Missing required fields (date, type, quantity, price)`);
              return;
            }

            // Validate date format
            const date = new Date(row.date);
            if (isNaN(date.getTime())) {
              errors.push(`Row ${rowNumber}: Invalid date format (use YYYY-MM-DD)`);
              return;
            }

            // Validate type
            const type = row.type.toLowerCase().trim();
            if (type !== 'buy' && type !== 'sell') {
              errors.push(`Row ${rowNumber}: Type must be 'buy' or 'sell'`);
              return;
            }

            // Validate quantity
            const quantity = parseInt(row.quantity);
            if (isNaN(quantity) || quantity <= 0) {
              errors.push(`Row ${rowNumber}: Quantity must be a positive number`);
              return;
            }

            // Validate price
            const price = parseFloat(row.price);
            if (isNaN(price) || price <= 0) {
              errors.push(`Row ${rowNumber}: Price must be a positive number`);
              return;
            }

            // If all validations pass, add to valid transactions
            validTransactions.push({
              date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
              type: type as 'buy' | 'sell',
              quantity,
              price,
              amount: quantity * price
            });
          });

          if (errors.length > 0) {
            setImportStatus({
              type: 'error',
              message: `Import failed:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : ''}`
            });
          } else if (validTransactions.length === 0) {
            setImportStatus({
              type: 'error',
              message: 'No valid transactions found in CSV file'
            });
          } else if (onImportTransactions) {
            const result = onImportTransactions(validTransactions);
            if (result.success) {
              setImportStatus({
                type: 'success',
                message: `Successfully imported ${result.count} transactions`
              });
              // Clear the file input
              if (data instanceof File) {
                // Clear file input if it was a file upload
                const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
              } else {
                // Clear text input if it was text input
                setCsvText('');
                setShowCsvInput(false);
              }
            } else {
              setImportStatus({
                type: 'error',
                message: result.error || 'Failed to import transactions'
              });
            }
          }
        } catch (error) {
          setImportStatus({
            type: 'error',
            message: 'Error parsing CSV file. Please check the format.'
          });
        } finally {
          setIsImporting(false);
        }
      },
      error: (error) => {
        setImportStatus({
          type: 'error',
          message: `Error reading file: ${error.message}`
        });
        setIsImporting(false);
      }
    });
  };

  const clearImportStatus = () => {
    setImportStatus({ type: null, message: '' });
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      { date: '2025-01-15', type: 'buy', quantity: 100, price: 6.25 },
      { date: '2025-01-20', type: 'buy', quantity: 200, price: 6.18 },
      { date: '2025-01-25', type: 'sell', quantity: 50, price: 6.30 },
      { date: '2025-01-30', type: 'buy', quantity: 150, price: 6.15 },
      { date: '2025-02-05', type: 'buy', quantity: 300, price: 6.22 },
    ];

    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_transactions.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const totalInvested = transactions
    .filter(t => t.type === 'buy')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalShares = transactions
    .reduce((sum, t) => sum + (t.type === 'buy' ? t.quantity : -t.quantity), 0);

  // Sort transactions by date for display
  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Calendar className="h-6 w-6 text-blue-400 mr-2" />
          <h2 className="text-2xl font-bold text-white">Transaction History</h2>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap gap-y-2">
          <button
            onClick={handleClearAll}
            className="flex items-center px-2 sm:px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm"
            title="Clear all transactions"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Reset All</span>
            <span className="sm:hidden">Reset</span>
          </button>
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isImporting}
            />
            <button
              className="flex items-center px-2 sm:px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isImporting}
              title="Import transactions from CSV file"
            >
              <Upload className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{isImporting ? 'Importing...' : 'Import CSV'}</span>
              <span className="sm:hidden">{isImporting ? 'Import...' : 'Import'}</span>
            </button>
          </div>
          <button
            onClick={() => setShowCsvInput(!showCsvInput)}
            className="flex items-center px-2 sm:px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs sm:text-sm"
            title="Paste CSV data directly"
          >
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Paste CSV</span>
            <span className="sm:hidden">Paste</span>
          </button>
          <button
            onClick={downloadSampleCSV}
            className="flex items-center px-2 sm:px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm"
            title="Download sample CSV file for testing"
          >
            <Download className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Sample CSV</span>
            <span className="sm:hidden">Sample</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center px-2 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Import Status Message */}
      {importStatus.type && (
        <div className={`mb-4 p-4 rounded-lg border flex items-start ${
          importStatus.type === 'success' 
            ? 'bg-green-900/30 border-green-800 text-green-200' 
            : 'bg-red-900/30 border-red-800 text-red-200'
        }`}>
          {importStatus.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1">
            <pre className="text-sm whitespace-pre-wrap">{importStatus.message}</pre>
          </div>
          <button
            onClick={clearImportStatus}
            className="ml-2 text-gray-400 hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* CSV Format Help */}
      {(showForm || showCsvInput) && (
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-blue-300">CSV Import Format</h4>
            <button
              onClick={downloadSampleCSV}
              className="flex items-center px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
            >
              <Download className="h-3 w-3 mr-1" />
              Download Sample
            </button>
          </div>
          <p className="text-xs text-blue-200 mb-2">
            Your CSV file should have the following columns (with header row):
          </p>
          
          {/* Visual CSV Example */}
          <div className="mb-3">
            <p className="text-xs text-blue-300 mb-2 font-medium">📊 Expected Format (like a spreadsheet):</p>
            <div className="bg-gray-800 border border-gray-600 rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="border-r border-gray-600 px-3 py-2 text-left text-gray-300 font-medium">date</th>
                    <th className="border-r border-gray-600 px-3 py-2 text-left text-gray-300 font-medium">type</th>
                    <th className="border-r border-gray-600 px-3 py-2 text-left text-gray-300 font-medium">quantity</th>
                    <th className="px-3 py-2 text-left text-gray-300 font-medium">price</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-t border-gray-600">
                    <td className="border-r border-gray-600 px-3 py-2">2025-01-15</td>
                    <td className="border-r border-gray-600 px-3 py-2">buy</td>
                    <td className="border-r border-gray-600 px-3 py-2">100</td>
                    <td className="px-3 py-2">6.25</td>
                  </tr>
                  <tr className="border-t border-gray-600">
                    <td className="border-r border-gray-600 px-3 py-2">2025-01-20</td>
                    <td className="border-r border-gray-600 px-3 py-2">buy</td>
                    <td className="border-r border-gray-600 px-3 py-2">200</td>
                    <td className="px-3 py-2">6.18</td>
                  </tr>
                  <tr className="border-t border-gray-600">
                    <td className="border-r border-gray-600 px-3 py-2">2025-01-25</td>
                    <td className="border-r border-gray-600 px-3 py-2">sell</td>
                    <td className="border-r border-gray-600 px-3 py-2">50</td>
                    <td className="px-3 py-2">6.30</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Raw CSV Text Example */}
          <div className="mb-3">
            <p className="text-xs text-blue-300 mb-2 font-medium">📝 Raw CSV Text Format:</p>
            <div className="bg-gray-800 p-3 rounded text-xs font-mono text-gray-300 border border-gray-600">
              date,type,quantity,price<br/>
              2025-01-15,buy,100,6.25<br/>
              2025-01-20,buy,200,6.18<br/>
              2025-01-25,sell,50,6.30
            </div>
          </div>
          
          <ul className="text-xs text-blue-300 space-y-1">
            <li>• <strong>date</strong>: YYYY-MM-DD format</li>
            <li>• <strong>type</strong>: "buy" or "sell"</li>
            <li>• <strong>quantity</strong>: Number of shares (positive integer)</li>
            <li>• <strong>price</strong>: Price per share (positive number)</li>
            <li>• <strong>Tip</strong>: Download the sample CSV above to see the exact format</li>
          </ul>
        </div>
      )}

      {/* CSV Text Input */}
      {showCsvInput && (
        <div className="mb-6 p-4 bg-indigo-900/20 border border-indigo-800 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Paste CSV Data</h3>
            <button
              onClick={() => {
                setShowCsvInput(false);
                setCsvText('');
                clearImportStatus();
              }}
              className="text-gray-400 hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-indigo-300 mb-2">
                CSV Data (copy and paste from Excel, Google Sheets, etc.)
              </label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="date,type,quantity,price&#10;2025-01-15,buy,100,6.25&#10;2025-01-20,buy,200,6.18&#10;2025-01-25,sell,50,6.30"
                className="w-full h-32 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-vertical"
                disabled={isImporting}
              />
              <p className="text-xs text-indigo-300 mt-1">
                💡 Tip: You can copy data directly from Excel or Google Sheets and paste it here
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleTextImport}
                disabled={isImporting || !csvText.trim()}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? 'Processing...' : 'Import Data'}
              </button>
              
              <button
                onClick={() => setCsvText('date,type,quantity,price\n2025-01-15,buy,100,6.25\n2025-01-20,buy,200,6.18\n2025-01-25,sell,50,6.30')}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Load Sample
              </button>
            </div>
          </div>
        </div>
      )}
      {showForm && (
        <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">
              {editingId ? 'Edit Transaction' : 'Add New Transaction'}
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'buy' | 'sell' })}
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800 text-white"
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
              <input
                type="number"
                step="1"
                value={formData.quantity || ''}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800 text-white"
                required
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Save className="h-4 w-4 mr-1" />
                {editingId ? 'Update' : 'Add'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No transactions yet</p>
          <p className="text-gray-500 text-sm">Add your first transaction to start tracking your investment</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Type</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-300">Quantity</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-300">Price</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-300">Amount</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                    <td className="py-3 px-4 text-gray-200">{formatDate(transaction.date)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        {transaction.type === 'buy' ? (
                          <TrendingUp className="h-4 w-4 text-green-400 mr-2" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-400 mr-2" />
                        )}
                        <span className={`font-medium capitalize ${
                          transaction.type === 'buy' ? 'text-green-300' : 'text-red-300'
                        }`}>
                          {transaction.type}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-200">{transaction.quantity.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-gray-200">{formatCurrency(transaction.price)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-medium ${
                        transaction.type === 'buy' ? 'text-red-300' : 'text-green-300'
                      }`}>
                        {transaction.type === 'buy' ? '-' : '+'}{formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => startEdit(transaction)}
                          className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition-colors"
                          title="Edit transaction"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(transaction.id)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                          title="Remove transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-800">
              <h3 className="text-sm font-medium text-blue-300 mb-1">Total Shares</h3>
              <p className="text-xl font-bold text-blue-100">{totalShares.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-green-900/30 rounded-lg border border-green-800">
              <h3 className="text-sm font-medium text-green-300 mb-1">Total Invested</h3>
              <p className="text-xl font-bold text-green-100">{formatCurrency(totalInvested)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};