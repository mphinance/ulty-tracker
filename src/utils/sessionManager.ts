// Session management utilities for URL-based persistence that works across devices
export class SessionManager {
  private static SESSION_PARAM = 'session';
  private static READONLY_PARAM = 'view';
  private static DATA_PARAM = 'data';
  private static SESSION_LENGTH = 12;

  // Generate a random session ID
  static generateSessionId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < this.SESSION_LENGTH; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Get session ID from URL or create new one
  static getOrCreateSessionId(): string {
    const urlParams = new URLSearchParams(window.location.search);
    let sessionId = urlParams.get(this.SESSION_PARAM);

    // If we're in read-only mode, use the view parameter as session ID
    const viewId = urlParams.get(this.READONLY_PARAM);
    if (viewId) {
      return viewId;
    }

    if (!sessionId) {
      sessionId = this.generateSessionId();
      this.updateURL(sessionId);
    }

    return sessionId;
  }

  // Check if current session is read-only
  static isReadOnlyMode(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has(this.READONLY_PARAM);
  }

  // Update URL with session ID without page reload
  static updateURL(sessionId: string): void {
    const url = new URL(window.location.href);
    url.searchParams.set(this.SESSION_PARAM, sessionId);
    url.searchParams.delete(this.READONLY_PARAM);
    url.searchParams.delete(this.DATA_PARAM);
    window.history.replaceState({}, '', url.toString());
  }

  // Get session-specific localStorage key
  static getStorageKey(baseKey: string, sessionId: string): string {
    return `${baseKey}_${sessionId}`;
  }

  // Get the current session's shareable URL (editable)
  static getShareableURL(): string {
    const url = new URL(window.location.href);
    url.searchParams.delete(this.READONLY_PARAM);
    url.searchParams.delete(this.DATA_PARAM);
    return url.toString();
  }

  // Create a read-only snapshot URL with embedded data
  static createReadOnlyURL(sessionId: string, portfolioData: any): string {
    const readOnlyId = this.generateSessionId();
    
    // Store the portfolio snapshot in localStorage with the read-only ID
    const snapshotKey = this.getStorageKey('readonly_snapshot', readOnlyId);
    localStorage.setItem(snapshotKey, JSON.stringify({
      ...portfolioData,
      createdAt: new Date().toISOString(),
      originalSessionId: sessionId
    }));

    // Create the read-only URL
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set(this.READONLY_PARAM, readOnlyId);
    
    return url.toString();
  }

  // Get read-only snapshot data
  static getReadOnlySnapshot(viewId: string): any | null {
    const snapshotKey = this.getStorageKey('readonly_snapshot', viewId);
    const snapshot = localStorage.getItem(snapshotKey);
    return snapshot ? JSON.parse(snapshot) : null;
  }

  // Create a fully portable URL with embedded data (with compression)
  static createPortableURL(portfolioData: any): string {
    // Import DataCompression dynamically to avoid circular dependencies
    const { DataCompression } = require('./dataCompression');
    
    // Check if URL would be too long
    if (DataCompression.wouldURLBeTooLong(portfolioData)) {
      throw new Error('Portfolio data is too large for a portable URL. Consider using a session-based link instead.');
    }
    
    const encodedData = DataCompression.compressForURL(portfolioData);
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set(this.DATA_PARAM, encodedData);
    return url.toString();
  }

  // Get portfolio data from portable URL
  static getPortableData(): any | null {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedData = urlParams.get(this.DATA_PARAM);
    
    if (encodedData) {
      // Import DataCompression dynamically to avoid circular dependencies
      const { DataCompression } = require('./dataCompression');
      return DataCompression.decompressFromURL(encodedData);
    }
    
    return null;
  }

  // Check if current URL contains portable data
  static hasPortableData(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has(this.DATA_PARAM);
  }

  // Check if current URL has a valid session
  static hasValidSession(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get(this.SESSION_PARAM);
    const viewId = urlParams.get(this.READONLY_PARAM);
    
    if (viewId) {
      return viewId.length === this.SESSION_LENGTH;
    }
    
    return sessionId !== null && sessionId.length === this.SESSION_LENGTH;
  }

  // Create a new session (generates new URL)
  static createNewSession(): string {
    const newSessionId = this.generateSessionId();
    this.updateURL(newSessionId);
    return newSessionId;
  }
}