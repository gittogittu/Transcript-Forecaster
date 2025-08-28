# Google Sheets API Integration Setup

This document explains how to set up and configure the Google Sheets API integration for the Transcript Analytics Platform.

## Prerequisites

1. A Google Cloud Platform (GCP) project
2. Google Sheets API enabled
3. A service account with appropriate permissions
4. A Google Sheet to store transcript data

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## Step 2: Enable Google Sheets API

1. In the Google Cloud Console, navigate to "APIs & Services" > "Library"
2. Search for "Google Sheets API"
3. Click on it and press "Enable"

## Step 3: Create a Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - Name: `transcript-analytics-service`
   - Description: `Service account for transcript analytics platform`
4. Click "Create and Continue"
5. Skip the optional steps and click "Done"

## Step 4: Generate Service Account Key

1. In the "Credentials" page, find your service account
2. Click on the service account email
3. Go to the "Keys" tab
4. Click "Add Key" > "Create New Key"
5. Choose "JSON" format and click "Create"
6. Download and securely store the JSON key file

## Step 5: Create Google Sheet

1. Create a new Google Sheet
2. Set up the following columns in the first row (header):
   - A1: `Client Name`
   - B1: `Month`
   - C1: `Transcript Count`
   - D1: `Created Date`
   - E1: `Updated Date`
   - F1: `Notes`
3. Note the spreadsheet ID from the URL (the long string between `/d/` and `/edit`)

## Step 6: Share Sheet with Service Account

1. In your Google Sheet, click "Share"
2. Add the service account email (found in the JSON key file as `client_email`)
3. Give it "Editor" permissions
4. Click "Send"

## Step 7: Configure Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Google Sheets API Configuration
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id-here
GOOGLE_SHEETS_RANGE=Sheet1!A:F
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-here\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_CLIENT_ID=your-client-id
```

### Extracting Values from Service Account JSON

From your downloaded JSON key file, extract these values:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: `client_email` field
- `GOOGLE_PRIVATE_KEY`: `private_key` field (keep the `\n` characters)
- `GOOGLE_PROJECT_ID`: `project_id` field
- `GOOGLE_PRIVATE_KEY_ID`: `private_key_id` field
- `GOOGLE_CLIENT_ID`: `client_id` field

## Step 8: Test the Connection

1. Start your development server: `npm run dev`
2. Visit: `http://localhost:3000/api/sheets/test-connection`
3. You should see a success message if everything is configured correctly

## API Endpoints

### GET /api/transcripts
Fetch all transcript data from Google Sheets.

**Response:**
```json
{
  "data": [
    {
      "id": "row_0",
      "clientName": "Client A",
      "month": "2024-01",
      "year": 2024,
      "transcriptCount": 10,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "notes": "Optional notes"
    }
  ],
  "success": true
}
```

### POST /api/transcripts
Add new transcript data to Google Sheets.

**Request Body:**
```json
{
  "clientName": "Client Name",
  "month": "2024-01",
  "transcriptCount": 15,
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transcript data added successfully"
}
```

### GET /api/sheets/test-connection
Test the Google Sheets API connection.

**Response:**
```json
{
  "connected": true,
  "error": null,
  "message": "Google Sheets connection successful"
}
```

## AHT Data Integration

The platform supports Average Handle Time (AHT) data integration from Google Sheets. AHT data can be stored in a separate sheet or combined with transcript data.

### Potential AHT API Endpoints

**Note:** These endpoints are planned for future implementation to support AHT analytics.

#### GET /api/aht
Fetch AHT data from Google Sheets.

**Response:**
```json
{
  "data": [
    {
      "client": "Client A",
      "overallAHT": 15.5,
      "reviewAHT": 8.2,
      "validationAHT": 7.3,
      "monthlyData": {
        "2024_Jan": 150,
        "2024_Feb": 175,
        "2024_Mar": 160
      },
      "grandTotal": 485
    }
  ],
  "success": true
}
```

#### POST /api/aht
Add or update AHT data in Google Sheets.

**Request Body:**
```json
{
  "client": "Client Name",
  "overallAHT": 15.5,
  "reviewAHT": 8.2,
  "validationAHT": 7.3,
  "monthlyData": {
    "2024_Jan": 150
  }
}
```

#### GET /api/aht/summary
Get AHT summary statistics.

**Response:**
```json
{
  "data": {
    "totalClients": 25,
    "averageAHT": 14.2,
    "medianAHT": 13.8,
    "highestAHT": { "client": "Client X", "value": 22.5 },
    "lowestAHT": { "client": "Client Y", "value": 8.1 },
    "totalVolume": 12500
  },
  "success": true
}
```

## Data Validation

The system validates all input data:

### Transcript Data Validation
- **Client Name**: Required, 1-100 characters
- **Month**: Required, YYYY-MM format
- **Transcript Count**: Required, non-negative integer
- **Notes**: Optional string

### AHT Data Validation
- **Client Name**: Required, 1-100 characters, must match existing clients
- **Overall AHT**: Required, positive number (minutes)
- **Review AHT**: Required, positive number (minutes)
- **Validation AHT**: Required, positive number (minutes)
- **Monthly Data**: Object with month keys (YYYY_MMM format) and positive numeric values
- **Grand Total**: Required, positive integer representing total volume

## Error Handling

The integration includes comprehensive error handling with structured error types:

### Error Types

```typescript
// API-specific errors
interface APIError extends AppError {
  name: 'APIError'
  code: 'API_ERROR'
  status: number
  endpoint: string
}

// Validation errors with field context
interface ValidationErrorData extends AppError {
  field: string
  value: any
}

// Consistent API response structure
interface DataFetchResult<T> {
  data: T | null
  error: string | null
  loading: boolean
}
```

The system handles:
- Authentication failures with detailed error context
- API rate limits with retry logic
- Network connectivity issues with graceful degradation
- Data validation errors with field-specific feedback
- Malformed responses with structured error reporting

## Security Considerations

1. **Never commit** the service account JSON file to version control
2. Use environment variables for all sensitive configuration
3. Restrict service account permissions to minimum required
4. Regularly rotate service account keys
5. Monitor API usage and set up alerts for unusual activity

## Troubleshooting

### Common Issues

1. **"GOOGLE_SHEETS_SPREADSHEET_ID environment variable is required"**
   - Ensure the environment variable is set in `.env.local`

2. **"The caller does not have permission"**
   - Verify the service account has been shared with the Google Sheet
   - Check that the service account has "Editor" permissions

3. **"Unable to parse range"**
   - Verify the `GOOGLE_SHEETS_RANGE` format (e.g., "Sheet1!A:F")
   - Ensure the sheet name matches exactly

4. **"Invalid credentials"**
   - Verify all service account details in environment variables
   - Check that the private key includes proper line breaks (`\n`)

### Testing Locally

Run the unit tests to verify the integration:

```bash
npm test -- --testPathPattern="google-sheets|transcript-data"
```

## Performance Considerations

- The service implements intelligent caching to reduce API calls
- Batch operations are used when possible
- Rate limiting is handled automatically with retry logic
- Consider implementing a local cache for frequently accessed data

## Migration Path

The system is designed to support future migration from Google Sheets to a database:

1. The data access layer abstracts the storage implementation
2. All interfaces remain consistent regardless of backend
3. Migration utilities are included for data export/import
4. Configuration switching allows gradual migration

For more information about database migration, see the design document.