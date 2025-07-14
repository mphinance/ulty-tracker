import React, { useState } from 'react';
import { Share2, Plus, Copy, Check, ExternalLink, Eye, EyeOff, Link, HardDrive, AlertTriangle } from 'lucide-react';
import { StorageStatus } from './StorageStatus';
import { StorageManager } from '../utils/storageManager';
import { DataCompression } from '../utils/dataCompression';

interface SessionManagerProps {
  sessionId: string;
  isReadOnly: boolean;
  isPortableMode?: boolean;
  onCreateNewSession: () => void;
  getShareableURL: () => string;
  getReadOnlyShareableURL: () => string;
  getPortableURL?: () => string;
  investment: any;
  transactions: any[];
  dividends: any[];
  currentPrice: number;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  sessionId,
  isReadOnly,
  isPortableMode = false,
  onCreateNewSession,
  getShareableURL,
  getReadOnlyShareableURL,
  getPortableURL,
  investment,
  transactions,
  dividends,
  currentPrice,
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showStorageStatus, setShowStorageStatus] = useState(false);
  const [copiedEditable, setCopiedEditable] = useState(false);
  const [copiedReadOnly, setCopiedReadOnly] = useState(false);
  const [copiedPortable, setCopiedPortable] = useState(false);

  const portfolioData = { investment, transactions, dividends, currentPrice };
  const storageHealth = StorageManager.getStorageHealth();
  const urlTooLong = DataCompression.wouldURLBeTooLong(portfolioData);
  const estimatedURLLength = DataCompression.getEstimatedURLLength(portfolioData);

  const handleCopyURL = async (url: string, type: 'editable' | 'readonly' | 'portable') => {
    try {
      await navigator.clipboard.writeText(url);
      if (type === 'editable') {
        setCopiedEditable(true);
        setTimeout(() => setCopiedEditable(false), 2000);
      } else if (type === 'readonly') {
        setCopiedReadOnly(true);
        setTimeout(() => setCopiedReadOnly(false), 2000);
      } else {
        setCopiedPortable(true);
        setTimeout(() => setCopiedPortable(false), 2000);
      }
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      if (type === 'editable') {
        setCopiedEditable(true);
        setTimeout(() => setCopiedEditable(false), 2000);
      } else if (type === 'readonly') {
        setCopiedReadOnly(true);
        setTimeout(() => setCopiedReadOnly(false), 2000);
      } else {
        setCopiedPortable(true);
        setTimeout(() => setCopiedPortable(false), 2000);
      }
    }
  };

  const handleNewSession = () => {
    if (window.confirm('Create a new session? This will generate a new URL and clear all current data.')) {
      onCreateNewSession();
    }
  };

  const handlePortableCopy = () => {
    if (urlTooLong) {
      alert('Portfolio data is too large for a portable URL. Consider using a session-based link instead, or reduce your transaction history.');
      return;
    }
    
    if (getPortableURL) {
      try {
        const url = getPortableURL();
        handleCopyURL(url, 'portable');
      } catch (error) {
        alert('Error creating portable URL: ' + (error as Error).message);
      }
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        {/* Storage Status Indicator */}
        {!isReadOnly && !isPortableMode && (
          <button
            onClick={() => setShowStorageStatus(true)}
            className={`flex items-center px-2 py-1 rounded text-xs transition-colors ${
              storageHealth.status === 'critical' ? 'bg-red-900/50 text-red-300 border border-red-800' :
              storageHealth.status === 'warning' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-800' :
              'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={`Storage: ${storageHealth.usage.percentage.toFixed(1)}% used`}
          >
            {storageHealth.status !== 'healthy' && <AlertTriangle className="h-3 w-3 mr-1" />}
            <HardDrive className="h-3 w-3 mr-1" />
            {storageHealth.usage.percentage.toFixed(0)}%
          </button>
        )}

        {isReadOnly ? (
          <div className="flex items-center px-3 py-2 bg-purple-900/50 text-purple-300 rounded-lg text-sm border border-purple-800">
            {isPortableMode ? (
              <>
                <Link className="h-4 w-4 mr-1" />
                Portable Link
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4 mr-1" />
                Read-Only View
              </>
            )}
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              title="Share this portfolio"
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </button>
            <button
              onClick={handleNewSession}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              title="Create new portfolio session"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Session
            </button>
          </>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Share Portfolio</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Session ID
                </label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 font-mono text-sm">
                    {sessionId}
                  </code>
                </div>
              </div>
              
              {/* Editable Share Link */}
              <div>
                <div className="flex items-center mb-2">
                  <Eye className="h-4 w-4 text-blue-400 mr-2" />
                  <label className="block text-sm font-medium text-blue-300">
                    Editable Link (Cross-Device)
                  </label>
                </div>
                <p className="text-xs text-blue-200 mb-2">
                  Full access - works on any device or browser with the same URL
                </p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={getShareableURL()}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm"
                  />
                  <button
                    onClick={() => handleCopyURL(getShareableURL(), 'editable')}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    title="Copy editable URL"
                  >
                    {copiedEditable ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Portable Link */}
              {getPortableURL && (
                <div>
                  <div className="flex items-center mb-2">
                    <Link className="h-4 w-4 text-green-400 mr-2" />
                    <label className="block text-sm font-medium text-green-300">
                      Portable Link (Self-Contained)
                    </label>
                    {urlTooLong && (
                      <AlertTriangle className="h-4 w-4 text-yellow-400 ml-2" title="URL too long" />
                    )}
                  </div>
                  <p className="text-xs text-green-200 mb-2">
                    Complete portfolio data embedded in URL - works anywhere, no server needed
                    {urlTooLong && (
                      <span className="block text-yellow-300 mt-1">
                        ⚠ Portfolio too large for portable URL ({StorageManager.formatBytes(estimatedURLLength)})
                      </span>
                    )}
                  </p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={urlTooLong ? "Portfolio data too large for URL" : "Click copy to generate portable URL"}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm"
                    />
                    <button
                      onClick={handlePortableCopy}
                      disabled={urlTooLong}
                      className={`flex items-center px-3 py-2 rounded transition-colors ${
                        urlTooLong 
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                      title={urlTooLong ? "Portfolio too large for portable URL" : "Copy portable URL"}
                    >
                      {copiedPortable ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Portfolio Report Link */}
              <div>
                <div className="flex items-center mb-2">
                  <EyeOff className="h-4 w-4 text-purple-400 mr-2" />
                  <label className="block text-sm font-medium text-purple-300">
                    Portfolio Report Link
                  </label>
                </div>
                <p className="text-xs text-purple-200 mb-2">
                  Shareable portfolio report - shows holdings, performance, and dividend schedule
                </p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={getReadOnlyShareableURL()}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm"
                  />
                  <button
                    onClick={() => handleCopyURL(getReadOnlyShareableURL(), 'readonly')}
                    className="flex items-center px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    title="Copy portfolio report URL"
                  >
                    {copiedReadOnly ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
                <div className="flex items-start">
                  <ExternalLink className="h-4 w-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-200">
                    <p className="font-medium mb-1">Sharing Options:</p>
                    <ul className="text-xs text-blue-300 space-y-1">
                      <li>• <strong>Editable:</strong> Live session - works across all devices and browsers</li>
                      <li>• <strong>Portable:</strong> Complete data in URL - works offline, no account needed</li>
                      <li>• <strong>Portfolio Report:</strong> Professional snapshot for sharing performance</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-gray-600 text-gray-200 rounded hover:bg-gray-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Storage Status Modal */}
      <StorageStatus 
        isVisible={showStorageStatus}
        onClose={() => setShowStorageStatus(false)}
      />
    </>
  );
};