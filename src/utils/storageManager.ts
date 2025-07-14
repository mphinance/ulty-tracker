// Storage management utilities for handling localStorage limits and cleanup
export class StorageManager {
  private static readonly MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB (conservative limit)
  private static readonly SESSION_PREFIX = 'ulty_';
  private static readonly CLEANUP_THRESHOLD = 0.8; // Clean up when 80% full
  private static readonly DEFAULT_KEEP_SESSIONS = 20; // Keep 20 most recent sessions

  // Check current storage usage
  static getStorageUsage(): { used: number; available: number; percentage: number } {
    let used = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }
    
    const available = this.MAX_STORAGE_SIZE - used;
    const percentage = (used / this.MAX_STORAGE_SIZE) * 100;
    
    return { used, available, percentage };
  }

  // Get all ULTY-related storage keys with metadata
  static getULTYSessions(): Array<{
    key: string;
    sessionId: string;
    type: string;
    size: number;
    lastModified: Date;
  }> {
    const sessions: Array<{
      key: string;
      sessionId: string;
      type: string;
      size: number;
      lastModified: Date;
    }> = [];

    for (let key in localStorage) {
      if (key.startsWith(this.SESSION_PREFIX)) {
        try {
          const value = localStorage[key];
          const size = key.length + value.length;
          
          // Extract session ID and type from key
          const parts = key.replace(this.SESSION_PREFIX, '').split('_');
          const type = parts[0];
          const sessionId = parts[1] || 'unknown';
          
          // Try to get last modified date from the data
          let lastModified = new Date();
          try {
            const data = JSON.parse(value);
            if (data.lastModified) {
              lastModified = new Date(data.lastModified);
            }
          } catch {
            // Use file system date if available, otherwise current date
          }
          
          sessions.push({
            key,
            sessionId,
            type,
            size,
            lastModified
          });
        } catch (error) {
          console.warn(`Error processing storage key ${key}:`, error);
        }
      }
    }
    
    return sessions.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  }

  // Clean up old sessions to free space
  static cleanupOldSessions(keepRecentCount: number = this.DEFAULT_KEEP_SESSIONS): number {
    const sessions = this.getULTYSessions();
    
    // Group sessions by sessionId to keep complete session data together
    const sessionGroups = new Map<string, typeof sessions>();
    sessions.forEach(session => {
      if (!sessionGroups.has(session.sessionId)) {
        sessionGroups.set(session.sessionId, []);
      }
      sessionGroups.get(session.sessionId)!.push(session);
    });

    // Sort session groups by most recent activity
    const sortedGroups = Array.from(sessionGroups.entries()).sort((a, b) => {
      const aLatest = Math.max(...a[1].map(s => s.lastModified.getTime()));
      const bLatest = Math.max(...b[1].map(s => s.lastModified.getTime()));
      return bLatest - aLatest;
    });

    // Keep the most recent session groups, remove the rest
    const groupsToDelete = sortedGroups.slice(keepRecentCount);
    
    let freedSpace = 0;
    for (const [sessionId, sessionFiles] of groupsToDelete) {
      for (const session of sessionFiles) {
        try {
          localStorage.removeItem(session.key);
          freedSpace += session.size;
        } catch (error) {
          console.warn(`Error removing session ${session.key}:`, error);
        }
      }
    }
    
    return freedSpace;
  }

  // Check if storage is getting full and clean up if needed
  static autoCleanupIfNeeded(): boolean {
    const usage = this.getStorageUsage();
    
    if (usage.percentage > this.CLEANUP_THRESHOLD * 100) {
      const freedSpace = this.cleanupOldSessions();
      console.log(`Storage cleanup: freed ${this.formatBytes(freedSpace)}, keeping ${this.DEFAULT_KEEP_SESSIONS} most recent sessions`);
      return true;
    }
    
    return false;
  }

  // Format bytes for human reading
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Compress data before storing (simple JSON compression)
  static compressData(data: any): string {
    try {
      const jsonString = JSON.stringify(data);
      // Add timestamp for cleanup purposes
      const dataWithTimestamp = {
        ...data,
        lastModified: new Date().toISOString()
      };
      return JSON.stringify(dataWithTimestamp);
    } catch (error) {
      console.error('Error compressing data:', error);
      return JSON.stringify(data);
    }
  }

  // Get storage health status
  static getStorageHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    usage: ReturnType<typeof StorageManager.getStorageUsage>;
    sessionCount: number;
    recommendations: string[];
  } {
    const usage = this.getStorageUsage();
    const sessions = this.getULTYSessions();
    const recommendations: string[] = [];
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (usage.percentage > 90) {
      status = 'critical';
      recommendations.push('Storage is nearly full - consider cleaning up old sessions');
      recommendations.push('Use portable links for long-term storage instead of sessions');
    } else if (usage.percentage > 70) {
      status = 'warning';
      recommendations.push('Storage usage is high - monitor for performance issues');
    }
    
    if (sessions.length > 25) {
      recommendations.push(`You have ${sessions.length} sessions - consider removing unused ones`);
    }
    
    return {
      status,
      usage,
      sessionCount: sessions.length,
      recommendations
    };
  }
}