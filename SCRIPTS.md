# Utility Scripts Documentation

This document describes the various utility scripts available in the Transcript Analytics Platform for database management, deployment, testing, and user administration.

## User Management Scripts

### update-user-role.js

**Location**: Root directory  
**Purpose**: Manage user roles and create admin users

```bash
node update-user-role.js
```

**Features**:
- Creates new admin users if they don't exist in the database
- Updates existing user roles to admin
- Validates user existence before operations
- Provides comprehensive error handling and logging
- Supports SSL connections for cloud databases (Neon, etc.)

**Configuration**:
Edit the `email` variable in the script to specify which user to manage:
```javascript
const email = 'your-admin@example.com';
```

**What it does**:
1. Connects to the PostgreSQL database using `DATABASE_URL` from `.env.local`
2. Checks if the specified user exists
3. Creates the user with admin role if they don't exist
4. Updates the user's role to admin if they exist with a different role
5. Verifies the final user status
6. Provides detailed logging throughout the process

**Use Cases**:
- Initial admin user setup after database creation
- Promoting existing users to admin role
- Production user role management
- Troubleshooting user access issues

## Database Management Scripts

### scripts/setup-database.js

**Purpose**: Comprehensive database setup and validation

```bash
node scripts/setup-database.js
```

**Features**:
- Environment variable validation
- Database connection testing
- Migration execution
- Development server testing
- Health endpoint verification

### scripts/create-tables.js

**Purpose**: Create database tables and schema

```bash
node scripts/create-tables.js
```

### scripts/run-migrations.js

**Purpose**: Execute database migrations

```bash
node scripts/run-migrations.js
```

### scripts/run-sql-migration.js

**Purpose**: Run specific SQL migration files

```bash
node scripts/run-sql-migration.js
```

## Testing Scripts

### scripts/integration-test.js

**Purpose**: Run integration tests

```bash
node scripts/integration-test.js
```

### scripts/performance-test.js

**Purpose**: Execute performance benchmarks

```bash
node scripts/performance-test.js
```

### scripts/final-integration.js

**Purpose**: Final integration testing before deployment

```bash
node scripts/final-integration.js
```

## Deployment Scripts

### scripts/deploy.js

**Purpose**: Handle application deployment

```bash
node scripts/deploy.js
```

### scripts/post-deployment-validation.js

**Purpose**: Validate deployment success

```bash
node scripts/post-deployment-validation.js
```

## Security Scripts

### scripts/setup-security.js

**Purpose**: Configure security settings and middleware

```bash
node scripts/setup-security.js
```

## Migration Scripts

### scripts/temp-migration.mjs

**Purpose**: Temporary migration utilities (ES modules)

```bash
node scripts/temp-migration.mjs
```

## Usage Guidelines

### Development Workflow

1. **Initial Setup**:
   ```bash
   npm run setup                    # Automated database setup
   node update-user-role.js         # Create your admin user
   ```

2. **Database Management**:
   ```bash
   node scripts/create-tables.js    # Create tables if needed
   node scripts/run-migrations.js   # Run migrations
   ```

3. **Testing**:
   ```bash
   node scripts/integration-test.js # Integration tests
   node scripts/performance-test.js # Performance tests
   ```

4. **Deployment**:
   ```bash
   node scripts/deploy.js                        # Deploy application
   node scripts/post-deployment-validation.js    # Validate deployment
   ```

### Production Workflow

1. **User Management**:
   ```bash
   node update-user-role.js         # Manage production user roles
   ```

2. **Database Operations**:
   ```bash
   node scripts/run-migrations.js   # Apply production migrations
   ```

3. **Security Setup**:
   ```bash
   node scripts/setup-security.js   # Configure production security
   ```

## Environment Requirements

All scripts require proper environment configuration in `.env.local`:

```env
# Database connection (required for most scripts)
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Additional configuration as needed
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

## Error Handling

All scripts include comprehensive error handling:
- **Connection Errors**: Detailed database connection troubleshooting
- **Permission Errors**: Clear guidance on database permissions
- **SSL Errors**: Automatic SSL configuration for cloud databases
- **Validation Errors**: Specific error messages for data validation issues

## Security Considerations

- **Credential Management**: Scripts read credentials from environment variables only
- **SSL Support**: Automatic SSL configuration for production databases
- **Error Logging**: Sensitive information is never logged in error messages
- **Permission Validation**: Scripts validate database permissions before operations

## Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   - Verify `DATABASE_URL` in `.env.local`
   - Check database server status
   - Validate SSL configuration for cloud databases

2. **Permission Denied**:
   - Ensure database user has required permissions
   - Check table creation and modification rights
   - Verify role management permissions for user scripts

3. **Migration Errors**:
   - Check migration file syntax
   - Verify database schema compatibility
   - Ensure sufficient disk space

4. **SSL Certificate Issues**:
   - Scripts automatically handle SSL for cloud databases
   - Verify SSL configuration in database connection string
   - Check firewall and network connectivity

### Getting Help

For script-specific issues:
1. Check the script's error output for specific guidance
2. Verify environment configuration
3. Test database connectivity independently
4. Review the relevant documentation sections

## Contributing

When adding new utility scripts:
1. Place them in the appropriate location (`scripts/` for build/deploy, root for user management)
2. Include comprehensive error handling
3. Add environment variable validation
4. Document the script in this file
5. Add corresponding npm scripts in `package.json` if appropriate