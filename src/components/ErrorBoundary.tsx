import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-red-500/20 rounded-lg p-8 max-w-2xl w-full">
            <div className="flex items-center mb-6">
              <AlertTriangle className="h-8 w-8 text-red-400 mr-3" />
              <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
            </div>
            
            <div className="space-y-4 mb-6">
              <p className="text-gray-300">
                An unexpected error occurred in the application. This might be due to a temporary issue.
              </p>
              
              {this.state.error && (
                <div className="bg-gray-900 border border-gray-700 rounded p-4">
                  <h3 className="text-sm font-semibold text-red-400 mb-2">Error Details:</h3>
                  <p className="text-sm text-gray-300 font-mono break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              {this.state.errorInfo && (
                <details className="bg-gray-900 border border-gray-700 rounded p-4">
                  <summary className="text-sm font-semibold text-yellow-400 cursor-pointer mb-2">
                    Stack Trace (Click to expand)
                  </summary>
                  <pre className="text-xs text-gray-400 overflow-auto max-h-40">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={this.handleReset}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </button>
            </div>
            
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/20 rounded">
              <p className="text-sm text-blue-300">
                <strong>Tip:</strong> If this error persists, try clearing your browser's local storage 
                or contact support with the error details above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}