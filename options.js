// Load accountId from storage and set input value
async function loadAccountId() {
  const { settings = {} } = await chrome.storage.local.get('settings');
  accountIdInput.value = settings.accountId || '';
}
/**
 * Options page script for YouTube Monitor Extension
 * Provides user interface for extension settings
 */

import logger from './logger.js';
import * as utils from './utils.js';

// DOM Elements
const enableShortsFilterToggle = document.getElementById('enableShortsFilter');
const enableChannelFilterToggle = document.getElementById('enableChannelFilter');
const enableKeywordFilterToggle = document.getElementById('enableKeywordFilter');
const enableLoggingToggle = document.getElementById('enableLogging');
const newChannelInput = document.getElementById('newChannel');
const addChannelButton = document.getElementById('addChannel');
const channelList = document.getElementById('channelList');
const clearLogsButton = document.getElementById('clearLogs');
const logsTable = document.getElementById('logsTable').querySelector('tbody');
const accountIdInput = document.getElementById('accountId');

// Initialize the options page
async function initialize() {
  // Initialize logger
  await logger.init();
  
  // Load settings
  await loadSettings();
  // Load accountId
  await loadAccountId();
  
  // Load allowed channels
  await loadAllowedChannels();
  
  // Load logs
  await loadLogs();
  
  // Set up event listeners
  setupEventListeners();
}

// Load settings from storage
async function loadSettings() {
  const { settings = utils.getDefaultSettings() } = await chrome.storage.local.get('settings');
  // Set toggle states
  enableShortsFilterToggle.checked = settings.enableShortsFilter !== false;
  enableChannelFilterToggle.checked = settings.enableChannelFilter !== false;
  enableKeywordFilterToggle.checked = settings.enableKeywordFilter !== false;
  enableLoggingToggle.checked = settings.enableLogging !== false;
// Load accountId from storage
async function loadAccountId() {
  const { settings = {} } = await chrome.storage.local.get('settings');
  accountIdInput.value = settings.accountId || '';
}
}

// Load allowed channels from storage
async function loadAllowedChannels() {
  const { allowedChannels = utils.getDefaultAllowedChannels() } = await chrome.storage.local.get('allowedChannels');
  // Clear existing list
  channelList.innerHTML = '';
  // Add each channel to the list
  allowedChannels.forEach(channel => {
    addChannelToList(channel);
  });
}

// Add a channel to the UI list
function addChannelToList(channel) {
  const li = document.createElement('li');
  li.className = 'channel-item';
  const channelName = document.createElement('span');
  channelName.textContent = `${channel.name} (${channel.id})`;
  channelName.className = 'channel-name';
  const removeButton = document.createElement('button');
  removeButton.textContent = 'Remove';
  removeButton.className = 'remove-channel';
  removeButton.addEventListener('click', () => removeChannel(channel.id));
  li.appendChild(channelName);
  li.appendChild(removeButton);
  channelList.appendChild(li);
}

// Remove a channel by ID
async function removeChannel(channelIdToRemove) {
  const { allowedChannels = [] } = await chrome.storage.local.get('allowedChannels');
  const updatedChannels = allowedChannels.filter(channel => channel.id !== channelIdToRemove);
  await chrome.storage.local.set({ allowedChannels: updatedChannels });
  await loadAllowedChannels();
}

// Add a new channel by URL or ID
async function addNewChannel() {
  const input = newChannelInput.value.trim();
  if (!input) {
    alert('Please enter a channel URL or ID');
    return;
  }
  let channelId = null;
  let channelName = null;
  // Try to parse as URL
  try {
    if (input.startsWith('http')) {
      const urlObj = new URL(input);
      if (urlObj.pathname.startsWith('/channel/')) {
        channelId = urlObj.pathname.split('/')[2];
        channelName = channelId;
      } else if (urlObj.pathname.startsWith('/@')) {
        // For /@username, use username as name, but ID lookup is not implemented
        channelId = urlObj.pathname.substring(2);
        channelName = channelId;
      }
    } else if (/^[A-Za-z0-9_-]{24}$/.test(input)) {
      // Looks like a channel ID
      channelId = input;
      channelName = input;
    } else {
      // Assume it's a username (not robust)
      channelId = input;
      channelName = input;
    }
  } catch (e) {
    alert('Invalid channel URL or ID');
    return;
  }
  if (!channelId) {
    alert('Could not extract channel ID');
    return;
  }
  // Get current allowed channels
  const { allowedChannels = [] } = await chrome.storage.local.get('allowedChannels');
  if (allowedChannels.some(channel => channel.id === channelId)) {
    alert('Channel already in the list');
    return;
  }
  // Add new channel
  const updatedChannels = [...allowedChannels, { id: channelId, name: channelName }];
  await chrome.storage.local.set({ allowedChannels: updatedChannels });
  newChannelInput.value = '';
  await loadAllowedChannels();
}

// Load logs from storage
async function loadLogs() {
  const logs = await logger.getLogs();
  
  // Clear existing logs
  logsTable.innerHTML = '';
  
  // Add each log entry to the table
  logs.forEach(log => {
    const row = document.createElement('tr');
    
    // Time column
    const timeCell = document.createElement('td');
    timeCell.textContent = utils.formatDate(log.timestamp);
    row.appendChild(timeCell);
    
    // Type column
    const typeCell = document.createElement('td');
    typeCell.textContent = log.type || '';
    row.appendChild(typeCell);
    
    // URL column
    const urlCell = document.createElement('td');
    urlCell.textContent = log.url || '';
    urlCell.className = 'url-cell';
    row.appendChild(urlCell);
    
    // Action column
    const actionCell = document.createElement('td');
    actionCell.textContent = log.action || '';
    row.appendChild(actionCell);
    
    // Details column
    const detailsCell = document.createElement('td');
    let details = '';
    
    if (log.reason) details += `Reason: ${log.reason}`;
    if (log.channel) details += `${details ? ', ' : ''}Channel: ${log.channel}`;
    
    detailsCell.textContent = details;
    row.appendChild(detailsCell);
    
    logsTable.appendChild(row);
  });
}

// Clear all logs
async function clearAllLogs() {
  if (confirm('Are you sure you want to clear all logs?')) {
    await logger.clearLogs();
    await loadLogs();
  }
}

// Save settings
async function saveSettings() {
  const settings = {
    enableShortsFilter: enableShortsFilterToggle.checked,
    enableChannelFilter: enableChannelFilterToggle.checked,
    enableKeywordFilter: enableKeywordFilterToggle.checked,
    enableLogging: enableLoggingToggle.checked,
    accountId: accountIdInput.value.trim() || 'user@example.com'
  };
  // Save settings to storage
  await chrome.storage.local.set({ settings });
  // Update logger state
  await logger.setLoggingEnabled(settings.enableLogging);

  // Send settings to remote server
  try {
    await fetch('http://localhost:8080/api/v1/createlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity: 'settings.save',
        data: settings,
        tabId: 0,
        accountId: settings.accountId || 'user@example.com'
      })
    });
  } catch (e) {
    console.error('Failed to send settings to remote server', e);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Save button
  const saveButton = document.getElementById('saveSettings');
  if (saveButton) {
    saveButton.addEventListener('click', saveSettings);
  }
  // Account ID input
  accountIdInput.addEventListener('change', saveSettings);
  // Settings toggles
  enableShortsFilterToggle.addEventListener('change', saveSettings);
  enableChannelFilterToggle.addEventListener('change', saveSettings);
  enableKeywordFilterToggle.addEventListener('change', saveSettings);
  enableLoggingToggle.addEventListener('change', saveSettings);
  
  // Channel management
  addChannelButton.addEventListener('click', addNewChannel);
  newChannelInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addNewChannel();
    }
  });
  
  // Logs management
  clearLogsButton.addEventListener('click', clearAllLogs);
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);
