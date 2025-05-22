const { ipcRenderer } = require('electron');

// DOM Elements
const statusFilePathInput = document.getElementById('statusFilePath');
const browseButton = document.getElementById('browseButton');
const apiEndpointInput = document.getElementById('apiEndpoint');
const formFieldNameInput = document.getElementById('formFieldName');
const scheduleHourSelect = document.getElementById('scheduleHour');
const scheduleMinuteSelect = document.getElementById('scheduleMinute');
const saveSettingsButton = document.getElementById('saveSettingsButton');
const runNowButton = document.getElementById('runNowButton');
const nextUpdateTimeSpan = document.getElementById('nextUpdateTime');
const statusPreviewDiv = document.getElementById('statusPreview');
const resultContainer = document.getElementById('resultContainer');
const refreshPreviewButton = document.getElementById('refreshPreviewButton');
const settingsIcon = document.getElementById('settingsIcon');
const configSection = document.getElementById('configSection');
const closeConfigButton = document.getElementById('closeConfigButton');

// Event Listeners
settingsIcon.addEventListener('click', () => {
  // Show the configuration section
  configSection.style.display = 'block';
});

closeConfigButton.addEventListener('click', () => {
  // Hide the configuration section
  configSection.style.display = 'none';
});

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
    formFieldName: formFieldNameInput.value ? `textarea-${formFieldNameInput.value}` : 'textarea-Venkatraman',
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
  
  if (settings.formFieldName) {
    // Extract the part after 'textarea-'
    const fieldName = settings.formFieldName.replace('textarea-', '');
    formFieldNameInput.value = fieldName;
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
    
    // Handle the next run time carefully
    if (result.nextRun) {
      try {
        const nextRunDate = new Date(result.nextRun);
        
        // Verify it's a valid date before updating
        if (!isNaN(nextRunDate.getTime())) {
          console.log('Valid next run date received:', nextRunDate);
          updateNextRunTime(nextRunDate);
        } else {
          console.error('Invalid date received:', result.nextRun);
          nextUpdateTimeSpan.textContent = 'Not scheduled';
        }
      } catch (err) {
        console.error('Error parsing next run date:', err);
        nextUpdateTimeSpan.textContent = 'Not scheduled';
      }
    } else {
      console.warn('No next run date received');
      nextUpdateTimeSpan.textContent = 'Not scheduled';
    }
    
    // Hide the configuration section after saving settings
    configSection.style.display = 'none';
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

ipcRenderer.on('update-next-run', (event, nextRunDateISO) => {
  if (nextRunDateISO) {
    try {
      const nextRunDate = new Date(nextRunDateISO);
      
      // Verify we have a valid date before updating
      if (!isNaN(nextRunDate.getTime())) {
        updateNextRunTime(nextRunDate);
      } else {
        nextUpdateTimeSpan.textContent = 'Not scheduled';
      }
    } catch (e) {
      console.error('Error parsing date:', e);
      nextUpdateTimeSpan.textContent = 'Not scheduled';
    }
  } else {
    nextUpdateTimeSpan.textContent = 'Not scheduled';
  }
});

// Helper Functions
function updateNextRunTime(date) {
  try {
    // Format the date in a user-friendly way
    nextUpdateTimeSpan.textContent = date.toLocaleString();
  } catch (e) {
    console.error('Error formatting date:', e);
    nextUpdateTimeSpan.textContent = 'Not scheduled';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Default to 7:00 PM
  scheduleHourSelect.value = "19";
  scheduleMinuteSelect.value = "0";
  
  // Hide configuration section by default
  configSection.style.display = 'none';
});
