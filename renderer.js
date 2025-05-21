const { ipcRenderer } = require('electron');

// DOM Elements
const statusFilePathInput = document.getElementById('statusFilePath');
const browseButton = document.getElementById('browseButton');
const apiEndpointInput = document.getElementById('apiEndpoint');
const scheduleHourSelect = document.getElementById('scheduleHour');
const scheduleMinuteSelect = document.getElementById('scheduleMinute');
const saveSettingsButton = document.getElementById('saveSettingsButton');
const runNowButton = document.getElementById('runNowButton');
const nextUpdateTimeSpan = document.getElementById('nextUpdateTime');
const statusPreviewDiv = document.getElementById('statusPreview');
const resultContainer = document.getElementById('resultContainer');
const refreshPreviewButton = document.getElementById('refreshPreviewButton');

// Event Listeners
browseButton.addEventListener('click', () => {
  ipcRenderer.send('select-status-file');
});

saveSettingsButton.addEventListener('click', (event) => {
  event.preventDefault();
  
  // Validate form
  if (!statusFilePathInput.value) {
    alert('Please select a status file');
    return;
  }
  
  if (!apiEndpointInput.value) {
    alert('Please enter an API endpoint URL');
    return;
  }
  
  // Save settings
  const settings = {
    statusFilePath: statusFilePathInput.value,
    apiEndpoint: apiEndpointInput.value,
    hour: parseInt(scheduleHourSelect.value),
    minute: parseInt(scheduleMinuteSelect.value)
  };
  
  ipcRenderer.send('save-settings', settings);
});

runNowButton.addEventListener('click', () => {
  // Validate if we have the necessary settings
  if (!statusFilePathInput.value || !apiEndpointInput.value) {
    alert('Please configure the status file and API endpoint first');
    return;
  }
  
  ipcRenderer.send('trigger-update-now');
  
  resultContainer.innerHTML = '<p class="text-info">Sending status update...</p>';
});

refreshPreviewButton.addEventListener('click', () => {
  ipcRenderer.send('get-status-preview');
});

// IPC Handlers
ipcRenderer.on('status-file-selected', (event, filePath) => {
  statusFilePathInput.value = filePath;
  
  // Update status preview
  ipcRenderer.send('get-status-preview');
});

ipcRenderer.on('settings-loaded', (event, settings) => {
  if (settings.statusFilePath) {
    statusFilePathInput.value = settings.statusFilePath;
  }
  
  if (settings.apiEndpoint) {
    apiEndpointInput.value = settings.apiEndpoint;
  }
  
  if (settings.hour !== undefined) {
    scheduleHourSelect.value = settings.hour;
  }
  
  if (settings.minute !== undefined) {
    scheduleMinuteSelect.value = settings.minute;
  }
  
  // Update status preview
  if (settings.statusFilePath) {
    ipcRenderer.send('get-status-preview');
  }
});

ipcRenderer.on('settings-saved', (event, result) => {
  if (result.success) {
    alert('Settings saved successfully');
    if (result.nextRun) {
      updateNextRunTime(new Date(result.nextRun));
    }
  } else {
    alert('Error saving settings: ' + result.message);
  }
});

ipcRenderer.on('update-result', (event, result) => {
  if (result.success) {
    resultContainer.innerHTML = `
      <div class="alert alert-success">
        <h5 class="success-message">Update Sent Successfully</h5>
        <p>Timestamp: ${new Date().toLocaleString()}</p>
        <p>Response: ${JSON.stringify(result.response || {})}</p>
      </div>
    `;
  } else {
    resultContainer.innerHTML = `
      <div class="alert alert-danger">
        <h5 class="error-message">Error Sending Update</h5>
        <p>Timestamp: ${new Date().toLocaleString()}</p>
        <p>Error: ${result.message}</p>
      </div>
    `;
  }
});

ipcRenderer.on('status-preview', (event, result) => {
  if (result.success) {
    statusPreviewDiv.innerHTML = `<pre>${result.content}</pre>`;
  } else {
    statusPreviewDiv.innerHTML = `<p class="text-danger">${result.message}</p>`;
  }
});

ipcRenderer.on('update-next-run', (event, nextRunDate) => {
  if (nextRunDate) {
    updateNextRunTime(new Date(nextRunDate));
  } else {
    nextUpdateTimeSpan.textContent = 'Not scheduled';
  }
});

// Helper Functions
function updateNextRunTime(date) {
  nextUpdateTimeSpan.textContent = date.toLocaleString();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Default to 7:00 PM
  scheduleHourSelect.value = "19";
  scheduleMinuteSelect.value = "0";
});
