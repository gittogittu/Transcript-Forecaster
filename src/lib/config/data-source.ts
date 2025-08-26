export type DataSourceType = 'google-sheets' | 'database';

export interface DataSourceConfig {
  type: DataSourceType;
  googleSheets?: {
    spreadsheetId: string;
    sheetName: string;
    credentialsPath?: string;
  };
  database?: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
  };
}

export function getDataSourceConfig(): DataSourceConfig {
  const dataSourceType = (process.env.DATA_SOURCE_TYPE as DataSourceType) || 'google-sheets';

  const config: DataSourceConfig = {
    type: dataSourceType,
  };

  if (dataSourceType === 'google-sheets') {
    config.googleSheets = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Transcript Data',
      credentialsPath: process.env.GOOGLE_SHEETS_CREDENTIALS_PATH,
    };
  } else if (dataSourceType === 'database') {
    config.database = {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      database: process.env.DATABASE_NAME || 'transcript_analytics',
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || '',
      ssl: process.env.DATABASE_SSL === 'true',
    };
  }

  return config;
}

export function isUsingDatabase(): boolean {
  return getDataSourceConfig().type === 'database';
}

export function isUsingGoogleSheets(): boolean {
  return getDataSourceConfig().type === 'google-sheets';
}

export function validateDataSourceConfig(config: DataSourceConfig): string[] {
  const errors: string[] = [];

  if (config.type === 'google-sheets') {
    if (!config.googleSheets?.spreadsheetId) {
      errors.push('Google Sheets spreadsheet ID is required');
    }
    if (!config.googleSheets?.sheetName) {
      errors.push('Google Sheets sheet name is required');
    }
  } else if (config.type === 'database') {
    if (!config.database?.host) {
      errors.push('Database host is required');
    }
    if (!config.database?.database) {
      errors.push('Database name is required');
    }
    if (!config.database?.user) {
      errors.push('Database user is required');
    }
    if (!config.database?.password) {
      errors.push('Database password is required');
    }
  } else {
    errors.push(`Invalid data source type: ${config.type}`);
  }

  return errors;
}