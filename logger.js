class Logger {
  constructor() {
    this.MAX_LOG_ENTRIES = 500;
    this.STORAGE_KEY = 'activityLogs';
    this.API_ENDPOINT = 'http://localhost:8080/api/v1/createlog';
  }

  /**
   * Log a debug message
   * @param {string} message - The debug message
   * @param {object} [extra] - Any extra info to log
   */
  async logDebug(message, extra = {}) {
    await this.addLog({
      timestamp: new Date().toISOString(),
      type: 'Debug',
      action: message,
      ...extra
    }); 
  }
/**
 * Logger module for YouTube Monitor Extension
 * Handles all logging operations using chrome.storage.local
 */

// class Logger {
//   constructor() {
//     this.MAX_LOG_ENTRIES = 500;
//     this.STORAGE_KEY = 'activityLogs';
//   }

  /**
   * Initialize logger and settings
   */
  async init() {
    // Check if logging is enabled
    const { settings = {} } = await chrome.storage.local.get('settings');
    this.loggingEnabled = settings.enableLogging !== false; // Default to true if not set
  }

  /**
   * Add a new log entry
   * @param {Object} logEntry - The log entry to add
   */
  async addLog(logEntry) {
    // Don't log if logging is disabled
    if (!this.loggingEnabled) return;

    // Ensure timestamp is present
    if (!logEntry.timestamp) {
      logEntry.timestamp = new Date().toISOString();
    }

    // Get current logs
    const { activityLogs = [] } = await chrome.storage.local.get(this.STORAGE_KEY);
    // Prepend new log (keep recent logs at the top)
    const updatedLogs = [logEntry, ...activityLogs];
    // Trim logs if they exceed the maximum
    const trimmedLogs = updatedLogs.slice(0, this.MAX_LOG_ENTRIES);
    // Save updated logs
    await chrome.storage.local.set({ [this.STORAGE_KEY]: trimmedLogs });

    // Send log to external API
    this.sendLogToApi(logEntry);
  }

  async sendLogToApi(logEntry) {
    // Get accountId from settings
    const { settings = {} } = await chrome.storage.local.get('settings');
    const accountId = settings.accountId || 'user@example.com';

    // Map logEntry.type to API activity type
    let activity = 'activity';
    if (logEntry.type === 'Debug') {
      activity = 'extention.debug';
    } else if (logEntry.type === 'YouTube Homepage') {
      activity = 'app.youtube.homepage';
    } else if (logEntry.type === 'YouTube Channel') {
      activity = 'app.youtube.channel';
    } else if (logEntry.type === 'YouTube Video') {
      // Distinguish between Shorts and normal video
      if (logEntry.isShorts) {
        activity = 'app.youtube.video.short';
      } else {
        activity = 'app.youtube.video.std';
      }
    } else if (logEntry.type === 'Non-YouTube') {
      activity = 'chrome.url.open';
    } else if (logEntry.type === 'settings.save') {
      activity = 'settings.save';
    }

    const apiLog = {
      activity,
      data: logEntry.url || logEntry.action || '',
      tabId: logEntry.tabId || 0,
      accountId
    };

    try {
      await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiLog)
      });
    } catch (e) {
      // Optionally log error locally
      console.error('Failed to send log to API', e);
    }
  }

  /**
   * Get all logs
   * @returns {Promise<Array>} Array of log entries
   */
  async getLogs() {
    const { activityLogs = [] } = await chrome.storage.local.get(this.STORAGE_KEY);
    return activityLogs;
  }

  /**
   * Clear all logs
   */
  async clearLogs() {
    await chrome.storage.local.set({ [this.STORAGE_KEY]: [] });
  }

  /**
   * Set logging enabled/disabled
   * @param {boolean} enabled - Whether logging should be enabled
   */
  async setLoggingEnabled(enabled) {
    this.loggingEnabled = enabled;
    
    // Update settings in storage
    const { settings = {} } = await chrome.storage.local.get('settings');
    settings.enableLogging = enabled;
    await chrome.storage.local.set({ settings });
  }

  /**
   * Log YouTube homepage action
   * @param {string} url - The URL of the page
   * @param {string} action - The action taken
   */
  async logYouTubeHomepage(url, action) {
    await this.addLog({
      timestamp: new Date().toISOString(),
      url,
      action,
      type: "YouTube Homepage"
    });
  }

  /**
   * Log YouTube Shorts video action
   * @param {string} url - The URL of the page
   * @param {string} action - The action taken
   * @param {string} channel - The channel name or ID
   * @param {string} reason - The reason for the action
   */
  async logYouTubeShortsVideo(url, action, channel, reason) {
    await this.addLog({
      timestamp: new Date().toISOString(),
      url,
      action,
      channel,
      reason,
      type: "YouTube Video",
      isShorts: true
    });
  }

  /**
   * Log YouTube channel action
   * @param {string} url - The URL of the page
   * @param {string} action - The action taken
   * @param {string} reason - The reason for the action
   */
  async logYouTubeChannel(url, action, reason) {
    await this.addLog({
      timestamp: new Date().toISOString(),
      url,
      action,
      reason,
      type: "YouTube Channel"
    });
  }

  /**
   * Log YouTube video action
   * @param {string} url - The URL of the page
   * @param {string} action - The action taken
   * @param {string} channel - The channel name
   * @param {string} reason - The reason for the action
   */
  async logYouTubeVideo(url, action, channel, reason) {
    await this.addLog({
      timestamp: new Date().toISOString(),
      url,
      action,
      channel,
      reason,
      type: "YouTube Video"
    });
  }

  /**
   * Log non-YouTube action
   * @param {string} url - The URL of the page
   * @param {string} action - The action taken
   * @param {string} reason - The reason for the action
   */
  async logNonYouTube(url, action, reason) {
    await this.addLog({
      timestamp: new Date().toISOString(),
      url,
      action,
      reason,
      type: "Non-YouTube"
    });
  }
}

// Create and export logger instance
const logger = new Logger();
export default logger;
