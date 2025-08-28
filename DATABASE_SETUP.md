# Database Setup Guide

This guide explains how to set up and configure the database for the Transcript Analytics Platform, including migration from Google Sheets.

## Recent Improvements

The database connection system has been enhanced with:
- **Neon DB Connection String Support**: Preferred method using `DATABASE_URL` for simplified setup
- **Flexible Configuration**: Automatic fallback to individual parameters if connection string not provided
- **Optimized Connection Pooling**: Improved timeout settings (20s connection, 10s idle) for better performance
- **Enhanced SSL Support**: Proper SSL configuration for cloud databases with certificate handling

## Prerequisites

- PostgreSQL 12 or higher
- Node.js 18 or higher
- Access to your Google Sheets data (for migration)

## Environment Variables

Add the following environment variables to your `.env.local` file:

### Data Source Configuration

```env
# Data source type: 'google-sheets' or 'database'
DATA_SOURCE_TYPE=database

# Google Sheets Configuration (if using google-sheets)
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SHEETS_SHEET_NAME=Transcript Data
GOOGLE_SHEETS_CREDENTIALS_PATH=path/to/credentials.json

# Neon Database Configuration (Recommended - using connection string)
DATABASE_URL=postgresql://username:password@ep-example-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
DATABASE_SSL=true

# Alternative Database Configuration (individual parameters)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=transcript_analytics
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password
DATABASE_SSL=false

# Optional Database Pool Configuration
DATABASE_MAX_CONNECTIONS=20
DATABASE_POOL_TIMEOUT=20000
DATABASE_IDLE_TIMEOUT=10000
```

## Database Setup

### Option 1: Neon Database (Recommended)

1. **Create a Neon account** at [neon.tech](https://neon.tech)
2. **Create a new project** and database
3. **Copy the connection string** from the Neon console
4. **Add to your `.env.local`**:
   ```env
   DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   DATABASE_SSL=true
   ```

### Option 2: Local PostgreSQL

1. **Create Database**:
   ```sql
   CREATE DATABASE transcript_analytics;
   CREATE USER your_username WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE transcript_analytics TO your_username;
   ```

2. **Configure individual parameters**:
   ```env
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_NAME=transcript_analytics
   DATABASE_USER=your_username
   DATABASE_PASSWORD=your_password
   DATABASE_SSL=false
   ```

### 2. Run Migrations

```bash
# Check migration status
npm run db:status

# Run all pending migrations
npm run db:migrate
```

### 3. Verify Setup

```bash
# Check if database is properly configured
npm run migrate db:status
```

## Migration from Google Sheets

### Option 1: Direct Migration

Migrate data directly from Google Sheets to the database:

```bash
# Migrate all data with validation
npm run migrate migrate --validate --skip-duplicates
```

### Option 2: Export/Import Process

For more control over the migration process:

```bash
# 1. Export data from Google Sheets
npm run migrate export --format json --output ./exports/transcript-data.json --metadata

# 2. Import data to database
npm run migrate import --format json --input ./exports/transcript-data.json --validate --skip-duplicates

# 3. Validate migration
npm run migrate validate
```

## Migration CLI Commands

### Export Commands

```bash
# Export to JSON with metadata
npm run migrate export --format json --metadata

# Export to CSV
npm run migrate export --format csv --output ./exports/data.csv
```

### Import Commands

```bash
# Import from JSON with validation
npm run migrate import --format json --input ./data.json --validate

# Import from CSV, skip duplicates
npm run migrate import --format csv --input ./data.csv --skip-duplicates
```

### Migration Commands

```bash
# Direct migration from Google Sheets to Database
npm run migrate migrate --validate --skip-duplicates

# Validate migration integrity
npm run migrate validate
```

### Database Schema Commands

```bash
# Check migration status
npm run migrate db:status

# Run pending migrations
npm run migrate db:migrate
```

## Configuration Switching

### Switch from Google Sheets to Database

1. Set up the database as described above
2. Run the migration:
   ```bash
   npm run migrate migrate --validate --skip-duplicates
   ```
3. Update your environment variables:
   ```env
   DATA_SOURCE_TYPE=database
   ```
4. Restart your application

### Switch from Database to Google Sheets

1. Update your environment variables:
   ```env
   DATA_SOURCE_TYPE=google-sheets
   ```
2. Ensure Google Sheets credentials are properly configured
3. Restart your application

## Error Handling

The database integration includes comprehensive error handling with structured error types:

```typescript
// Database-specific errors
interface DatabaseError extends AppError {
  name: 'DatabaseError'
  code: 'DB_ERROR'
  query?: string
  constraint?: string
}

// Migration-specific errors
interface MigrationError extends AppError {
  name: 'MigrationError'
  code: 'MIGRATION_ERROR'
  migrationFile?: string
  step?: string
}
```

All database operations return consistent error structures with:
- Detailed error messages with context
- Error codes for programmatic handling
- Timestamps for debugging
- Query information when applicable

## Troubleshooting

### Connection Issues

1. **Database connection fails:**
   - Verify PostgreSQL is running
   - Check connection parameters in `.env.local`
   - Ensure user has proper permissions
   - Review structured error logs for specific connection details

2. **Migration fails:**
   - Check database logs for specific errors
   - Verify migration files are not corrupted
   - Ensure sufficient disk space
   - Use structured error reporting to identify specific migration steps

### Data Issues

1. **Validation errors during migration:**
   - Review structured ValidationErrorData for field-specific issues
   - Clean up data in Google Sheets before migration
   - Use `--skip-duplicates` flag if appropriate
   - Check validation warnings for potential data quality issues

2. **Missing data after migration:**
   - Run `npm run migrate validate` to check data integrity
   - Compare record counts between sources
   - Check for data transformation issues
   - Review migration logs with structured error context

### Performance Issues

1. **Slow migration:**
   - Increase `DATABASE_MAX_CONNECTIONS` if needed
   - Consider migrating in smaller batches
   - Monitor database performance during migration

2. **Application performance:**
   - Ensure database indexes are created (handled by migrations)
   - Monitor query performance
   - Consider connection pooling adjustments

## Production Deployment

### Database Setup

1. Create production database with appropriate security settings
2. Set up SSL connections if required
3. Configure backup and monitoring

### Environment Configuration

```env
# Production database settings (Neon recommended)
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
DATABASE_SSL=true
DATABASE_MAX_CONNECTIONS=50
DATABASE_POOL_TIMEOUT=30000
DATABASE_IDLE_TIMEOUT=15000
```

### Migration Process

1. Test migration in staging environment first
2. Schedule migration during low-traffic periods
3. Have rollback plan ready
4. Monitor application after migration

## Monitoring and Maintenance

### Regular Tasks

1. **Database backups:** Set up automated backups
2. **Performance monitoring:** Monitor query performance and connection usage
3. **Data validation:** Periodically validate data integrity
4. **Index maintenance:** Monitor and maintain database indexes

### Health Checks

The application includes health check endpoints:

- Database connectivity: Built into the DataService
- Migration status: Available via CLI commands
- Data integrity: Use validation commands

## Security Considerations

1. **Database access:** Use dedicated database user with minimal required permissions
2. **Connection security:** Use SSL in production
3. **Credential management:** Store credentials securely, never in code
4. **Network security:** Restrict database access to application servers only

## Support

For issues with database setup or migration:

1. Check the troubleshooting section above
2. Review application logs for specific error messages
3. Verify environment configuration
4. Test database connectivity independently