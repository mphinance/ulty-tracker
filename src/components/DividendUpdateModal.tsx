import React, { useState } from 'react';
import { RefreshCw, ExternalLink, Plus, Trash2, Save, X, AlertCircle, CheckCircle } from 'lucide-react';
import { DividendUpdateService, YahooDividendData } from '../services/dividendUpdateService';

interface DividendUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateDividends: (dividends: YahooDividendData[], currentPrice?: number) => void;
  currentPrice: number;
}

export const DividendUpdateModal: React.FC<DividendUpdateModalProps> = ({
  isOpen,
  onClose,
  onUpdateDividends,
  currentPrice,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [newPrice, setNewPrice] = useState(currentPrice);
  const [manualDividends, setManualDividends] = useState<YahooDividendData[]>([
    { date: new Date().toISOString().split('T')[0], amount: 0 }
  ]);

  const handleAutoUpdate = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await DividendUpdateService.fetchLatestDividends();
      
      if (result.success && result.data) {
        onUpdateDividends(result.data, result.currentPrice);
        setSuccess(`Successfully updated with ${result.data.length} dividend entries`);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Failed to fetch dividend data');
        setManualMode(true); // Switch to manual mode on auto-fetch failure
      }
    } catch (err) {
      setError('Network error occurred while fetching data');
      setManualMode(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualUpdate = () => {
    const validDividends = manualDividends.filter(div => 
      div.date && div.amount > 0
    );

    if (validDividends.length === 0) {
      setError('Please add at least one valid dividend entry');
      return;
    }

    onUpdateDividends(validDividends, newPrice);
    setSuccess(`Successfully added ${validDividends.length} dividend entries`);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const addManualDividend = () => {
    setManualDividends([
      ...manualDividends,
      { date: new Date().toISOString().split('T')[0], amount: 0 }
    ]);
  };

  const updateManualDividend = (index: number, field: 'date' | 'amount', value: string | number) => {
    const updated = [...manualDividends];
    updated[index] = { ...updated[index], [field]: value };
    setManualDividends(updated);
  };

  const removeManualDividend = (index: number) => {
    setManualDividends(manualDividends.filter((_, i) => i !== index));
  };

  const openYahooFinance = () => {
    window.open('https://finance.yahoo.com/quote/ULTY/history/?filter=div', '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <RefreshCw className="h-6 w-6 text-blue-400 mr-2" />
            <h3 className="text-xl font-semibold text-white">Update Dividend Data</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-200">
              <p className="font-medium mb-1">Update Failed</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-800 rounded-lg flex items-start">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-200">
              <p className="font-medium">{success}</p>
            </div>
          </div>
        )}

        {!manualMode ? (
          /* Auto Update Mode */
          <div className="space-y-6">
            <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
              <div className="flex items-start">
                <RefreshCw className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-200">
                  <p className="font-medium mb-2">Automatic Update from Polygon.io</p>
                  <p className="mb-3">
                    This will fetch the latest dividend data and current stock price from Polygon.io API.
                  </p>
                  <button
                    onClick={openYahooFinance}
                    className="inline-flex items-center text-blue-300 hover:text-blue-200 underline"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View ULTY Dividend History on Yahoo Finance (Reference)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAutoUpdate}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Fetching from Polygon.io...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Fetch from API
                  </>
                )}
              </button>
              <button
                onClick={() => setManualMode(true)}
                className="px-4 py-3 bg-gray-600 text-gray-200 rounded-lg hover:bg-gray-500 transition-colors"
              >
                Manual Entry
              </button>
            </div>
          </div>
        ) : (
          /* Manual Entry Mode */
          <div className="space-y-6">
            <div className="p-4 bg-purple-900/20 border border-purple-800 rounded-lg">
              <div className="flex items-start">
                <Plus className="h-5 w-5 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-purple-200">
                  <p className="font-medium mb-2">Manual Dividend Entry</p>
                  <p className="mb-3">
                    Add new dividend payments manually. Check Yahoo Finance for the latest dividend history.
                  </p>
                  <button
                    onClick={openYahooFinance}
                    className="inline-flex items-center text-purple-300 hover:text-purple-200 underline"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open Yahoo Finance Dividend History
                  </button>
                </div>
              </div>
            </div>

            {/* Current Price Update */}
            <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Update Current Stock Price
              </label>
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="6.23"
                />
              </div>
            </div>

            {/* Manual Dividend Entries */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-medium text-white">Dividend Entries</h4>
                <button
                  onClick={addManualDividend}
                  className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Entry
                </button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {manualDividends.map((dividend, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Date</label>
                      <input
                        type="date"
                        value={dividend.date}
                        onChange={(e) => updateManualDividend(index, 'date', e.target.value)}
                        className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Amount ($)</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={dividend.amount || ''}
                        onChange={(e) => updateManualDividend(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="0.0950"
                      />
                    </div>
                    <button
                      onClick={() => removeManualDividend(index)}
                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                      title="Remove entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleManualUpdate}
                className="flex-1 flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Updates
              </button>
              <button
                onClick={() => setManualMode(false)}
                className="px-4 py-3 bg-gray-600 text-gray-200 rounded-lg hover:bg-gray-500 transition-colors"
              >
                Back to Auto
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};