const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const schedule = require('node-schedule');
const axios = require('axios');

let mainWindow;
let statusFilePath = '';
let apiEndpoint = '';
let formFieldName = ''; // Will be set with user input
let scheduledJob = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
  
  // Open DevTools during development
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  
  // Load saved settings
  loadSettings();
  
  // Set a default schedule after a slight delay to ensure window is fully loaded
  setTimeout(() => {
    // Only schedule if not already scheduled from settings
    if (!scheduledJob) {
      scheduleStatusUpdate(19, 0);
    }
  }, 1500);
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Load settings from config file
function loadSettings() {
  try {
    if (fs.existsSync(path.join(app.getPath('userData'), 'settings.json'))) {
      const settings = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'settings.json')));
      statusFilePath = settings.statusFilePath || '';
      apiEndpoint = settings.apiEndpoint || '';
      formFieldName = settings.formFieldName || 'textarea-Venkatraman';
      
      // Send to renderer when window is ready
      if (mainWindow) {
        mainWindow.webContents.on('did-finish-load', () => {
          // First send settings
          mainWindow.webContents.send('settings-loaded', settings);
          
          // Then schedule the job if we have valid settings
          if (statusFilePath && apiEndpoint) {
            scheduleStatusUpdate(settings.hour || 19, settings.minute || 0);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Save settings to config file
function saveSettings(settings) {
  try {
    fs.writeFileSync(
      path.join(app.getPath('userData'), 'settings.json'),
      JSON.stringify(settings)
    );
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Schedule the status update job
function scheduleStatusUpdate(hour, minute) {
  // Cancel any existing scheduled job
  if (scheduledJob) {
    scheduledJob.cancel();
  }
  
  // Schedule new job
  scheduledJob = schedule.scheduleJob(`${minute} ${hour} * * *`, function() {
    sendStatusUpdate();
  });
  
  // Get next run time and convert to ISO string for reliable serialization over IPC
  const nextRun = scheduledJob ? scheduledJob.nextInvocation() : null;
  const nextRunTimeISO = nextRun ? nextRun.toISOString() : null;
  
  // Make sure window is ready before sending messages
  if (mainWindow && mainWindow.webContents) {
    if (mainWindow.webContents.isLoading()) {
      // If window is still loading, wait until it's ready
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('update-next-run', nextRunTimeISO);
      });
    } else {
      // Window is ready, send immediately
      mainWindow.webContents.send('update-next-run', nextRunTimeISO);
    }
  }
  
  console.log(`Status update scheduled for ${hour}:${minute} every day`);
  return nextRun;
}

// Read status file and send update to API using Contact Form 7 format
async function sendStatusUpdate() {
  try {
    // Check if file exists
    if (!fs.existsSync(statusFilePath)) {
      mainWindow.webContents.send('update-result', {
        success: false,
        message: 'Status file not found'
      });
      return;
    }
    
    // Read status content
    const statusContent = fs.readFileSync(statusFilePath, 'utf8');
    
    // Create FormData for Contact Form 7
    const FormData = require('form-data');
    const formData = new FormData();
    
    // Add required Contact Form 7 fields
    formData.append('_wpcf7', '4607');
    formData.append('_wpcf7_version', '6.0.6');
    formData.append('_wpcf7_locale', 'en_US');
    formData.append('_wpcf7_unit_tag', 'wpcf7-f4607-p4606-o1');
    formData.append('_wpcf7_container_post', '4606');
    formData.append('_wpcf7_posted_data_hash', '');
    
    // Add the actual status content to the textarea field
    const fieldName = formFieldName || 'textarea-Venkatraman';
    formData.append(fieldName, statusContent);
    
    // Send to API with proper headers for multipart/form-data
    const response = await axios.post(apiEndpoint, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    mainWindow.webContents.send('update-result', {
      success: true,
      message: 'Status update sent successfully',
      response: response.data
    });
    
    console.log('Status update sent successfully', response.data);
  } catch (error) {
    mainWindow.webContents.send('update-result', {
      success: false,
      message: `Error sending status update: ${error.message}`
    });
    
    console.error('Error sending status update:', error);
  }
}

// IPC handlers
ipcMain.on('select-status-file', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    statusFilePath = result.filePaths[0];
    event.reply('status-file-selected', statusFilePath);
  }
});

ipcMain.on('save-settings', (event, settings) => {
  console.log('Saving settings:', settings);
  statusFilePath = settings.statusFilePath;
  apiEndpoint = settings.apiEndpoint;
  formFieldName = settings.formFieldName || 'textarea-Venkatraman';
  
  // Save all settings including hour and minute
  saveSettings(settings);
  
  // Make sure hour and minute are properly parsed as integers
  const hour = parseInt(settings.hour) || 19;
  const minute = parseInt(settings.minute) || 0;
  
  console.log(`Setting schedule for ${hour}:${minute}`);
  
  // Schedule the job with new settings
  const nextRun = scheduleStatusUpdate(hour, minute);
  
  // Convert nextRun to ISO string for reliable transmission
  const nextRunISO = nextRun ? nextRun.toISOString() : null;
  
  // Send the response with the ISO string
  event.reply('settings-saved', {
    success: true,
    nextRun: nextRunISO
  });
});

ipcMain.on('trigger-update-now', () => {
  sendStatusUpdate();
});

ipcMain.on('get-status-preview', (event) => {
  try {
    if (!statusFilePath || !fs.existsSync(statusFilePath)) {
      event.reply('status-preview', {
        success: false,
        message: 'Status file not set or not found'
      });
      return;
    }
    
    const statusContent = fs.readFileSync(statusFilePath, 'utf8');
    event.reply('status-preview', {
      success: true,
      content: statusContent
    });
  } catch (error) {
    event.reply('status-preview', {
      success: false,
      message: `Error reading status file: ${error.message}`
    });
  }
});
