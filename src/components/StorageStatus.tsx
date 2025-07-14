import React, { useState, useEffect } from 'react';
import { AlertTriangle, HardDrive, Trash2, Info } from 'lucide-react';
import { StorageManager } from '../utils/storageManager';

interface StorageStatusProps {
  isVisible: boolean;
  onClose: () => void;
}

export const StorageStatus: React.FC<StorageStatusProps> = ({ isVisible, onClose }) => {
  const [storageHealth, setStorageHealth] = useState(StorageManager.getStorageHealth());
  const [sessions, setSessions] = useState(StorageManager.getULTYSessions());

  useEffect(() => {
    if (isVisible) {
      setStorageHealth(StorageManager.getStorageHealth());
      setSessions(StorageManager.getULTYSessions());
    }
  }, [isVisible]);

  const handleCleanup = () => {
    if (window.confirm('Remove old portfolio sessions? This will keep your 20 most recent sessions.')) {
      const freedSpace = StorageManager.cleanupOldSessions(20);
      setStorageHealth(StorageManager.getStorageHealth());
      setSessions(StorageManager.getULTYSessions());
      alert(`Cleaned up ${StorageManager.formatBytes(freedSpace)} of storage space.`);
    }
  };

  const handleRemoveSession = (key: string) => {
    if (window.confirm('Remove this portfolio session? This action cannot be undone.')) {
      localStorage.removeItem(key);
      setStorageHealth(StorageManager.getStorageHealth());
      setSessions(StorageManager.getULTYSessions());
    }
  };

  if (!isVisible) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-300 bg-red-900/30 border-red-800';
      case 'warning': return 'text-yellow-300 bg-yellow-900/30 border-yellow-800';
      default: return 'text-green-300 bg-green-900/30 border-green-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <HardDrive className="h-6 w-6 text-blue-400 mr-2" />
            <h3 className="text-xl font-semibold text-white">Storage Management</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1"
          >
            ×
          </button>
        </div>

        {/* Storage Health Status */}
        <div className={`mb-6 p-4 rounded-lg border ${getStatusColor(storageHealth.status)}`}>
          <div className="flex items-start">
            {storageHealth.status === 'critical' ? (
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
            ) : storageHealth.status === 'warning' ? (
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
            ) : (
              <Info className="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h4 className="font-medium mb-2">
                Storage Status: {storageHealth.status.charAt(0).toUpperCase() + storageHealth.status.slice(1)}
              </h4>
              <div className="text-sm mb-3">
                <p>Used: {StorageManager.formatBytes(storageHealth.usage.used)} ({storageHealth.usage.percentage.toFixed(1)}%)</p>
                <p>Available: {StorageManager.formatBytes(storageHealth.usage.available)}</p>
                <p>Sessions: {storageHealth.sessionCount}</p>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                <div 
                  className={`h-2 rounded-full ${
                    storageHealth.status === 'critical' ? 'bg-red-500' :
                    storageHealth.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(storageHealth.usage.percentage, 100)}%` }}
                />
              </div>

              {storageHealth.recommendations.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Recommendations:</p>
                  <ul className="text-xs space-y-1">
                    {storageHealth.recommendations.map((rec, index) => (
                      <li key={index}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cleanup Actions */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={handleCleanup}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clean Up Old Sessions (Keep 20 Recent)
          </button>
        </div>

        {/* Session List */}
        <div>
          <h4 className="text-lg font-medium text-white mb-3">Portfolio Sessions ({sessions.length})</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {sessions.map((session) => (
              <div key={session.key} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-200">
                      {session.sessionId}
                    </span>
                    <span className="ml-2 px-2 py-1 bg-gray-600 text-gray-300 rounded text-xs">
                      {session.type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {StorageManager.formatBytes(session.size)} • {session.lastModified.toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveSession(session.key)}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                  title="Remove session"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
          <div className="text-sm text-blue-200">
            <p className="font-medium mb-1">Storage Tips:</p>
            <ul className="text-xs text-blue-300 space-y-1">
              <li>• System keeps your <strong>20 most recent</strong> portfolio sessions automatically</li>
              <li>• Use <strong>Portable Links</strong> for long-term storage - they don't use browser storage</li>
              <li>• Each portfolio session stores transactions, dividends, and settings</li>
              <li>• Clean up manually if you need more space before the automatic limit</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};