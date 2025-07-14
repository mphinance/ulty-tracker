import React, { useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Wifi, WifiOff, AlertCircle, Edit2, Save, X } from 'lucide-react';
import { PolygonService, PolygonStockData } from '../services/polygonService';

interface PriceUpdaterProps {
  currentPrice: number;
  onPriceUpdate?: (price: number) => void;
  isReadOnly?: boolean;
  symbol?: string;
}

export const PriceUpdater: React.FC<PriceUpdaterProps> = ({
  currentPrice,
  onPriceUpdate,
  isReadOnly = false,
  symbol = 'ULTY'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editPrice, setEditPrice] = useState(currentPrice);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);

  const handleRefresh = async () => {
    if (isReadOnly || !onPriceUpdate) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await PolygonService.getRealTimeQuote(symbol);
      
      if (result.success && result.data) {
        onPriceUpdate(result.data.price);
        setLastUpdated(new Date());
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch price');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualUpdate = () => {
    if (isReadOnly || !onPriceUpdate) return;
    
    if (editPrice > 0) {
      onPriceUpdate(editPrice);
      setLastUpdated(new Date());
      setIsEditing(false);
      setError(null);
    }
  };

  const handleCancelEdit = () => {
    setEditPrice(currentPrice);
    setIsEditing(false);
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return null;
    return lastUpdated.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="text-right">
      <div className="flex items-center justify-end space-x-2 mb-1">
        {isEditing && !isReadOnly ? (
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">$</span>
            <input
              type="number"
              step="0.01"
              value={editPrice || ''}
              onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
              className="w-24 px-2 py-1 text-lg font-bold bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleManualUpdate}
              className="p-1 text-green-400 hover:text-green-300 hover:bg-green-900/30 rounded transition-colors"
              title="Save price"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-1 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors"
              title="Cancel edit"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <span className="text-2xl font-bold text-white">
              {formatCurrency(currentPrice)}
            </span>
            {!isReadOnly && onPriceUpdate && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition-colors"
                  title="Edit price manually"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="p-1 text-green-400 hover:text-green-300 hover:bg-green-900/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh from Polygon API"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="text-xs text-gray-400">
        Current ULTY Price
        {lastUpdated && (
          <span className="block text-green-400">
            Updated: {formatLastUpdated()}
          </span>
        )}
      </div>
      
      {error && (
        <div className="flex items-center justify-end mt-1">
          <AlertCircle className="h-3 w-3 text-red-400 mr-1" />
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}
      
      {!error && !lastUpdated && (
        <div className="text-xs text-gray-500 mt-1">
          Market price (15min delayed)
        </div>
      )}
    </div>
  );
};