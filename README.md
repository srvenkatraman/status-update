# Status Update Scheduler

An Electron desktop application that reads daily status from a text file and posts it to a web API at a scheduled time (default: 7 PM daily).

## Features

- Schedule daily status updates at a specific time
- Select a text file containing your status update
- Configure API endpoint for posting status
- Preview your status content before sending
- Run updates manually with a single click
- View status of sent updates
- Automatically runs in the background

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the application:
   ```
   npm start
   ```

## How to Use

1. **Configure Settings**:
   - Click "Browse" to select your status text file
   - Enter the API endpoint URL where status will be posted
   - Set the desired time for the daily update (default is 7:00 PM)
   - Click "Save Settings"

2. **View Status Preview**:
   - The application shows a preview of your status file
   - Click "Refresh" to reload the preview if the file has changed

3. **Manual Updates**:
   - Click "Run Update Now" to immediately send your status to the API

4. **Results**:
   - View the results section to see if your update was sent successfully
   - Any errors will be displayed here

## API Format

The application sends data to your API in the following JSON format:

```json
{
  "status": "Your status content from the file",
  "timestamp": "2023-05-21T13:45:30.123Z"
}
```

## Development

- Run `npm start` to start the application in development mode
- Run `npm run build` to build the application for distribution

## Sample Status File

A sample status file (`sample_status.txt`) is included in the repository as an example of how to format your status updates.
