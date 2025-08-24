# Emulator Usage Guide

This guide covers how to use the local emulators for development and testing of the Document Management System.

## Quick Start

Start all emulators with a single command:
```bash
npm run emulators:start
```

This will start:
- PostgreSQL database emulator
- Redis cache emulator
- S3-compatible storage emulator
- Azure Blob Storage emulator

## Available Commands

### Core Emulator Management
```bash
# Start all emulators
npm run emulators:start

# Stop all emulators
npm run emulators:stop

# Restart all emulators
npm run emulators:restart

# View real-time emulator logs
npm run emulators:logs

# Check emulator status
npm run emulators:status

# Clean up emulator data and containers
npm run emulators:cleanup
```

### What Each Command Does

- **`emulators:start`**: Starts all emulator services using Docker Compose
- **`emulators:stop`**: Gracefully stops all emulator services
- **`emulators:restart`**: Stops and then starts all emulator services
- **`emulators:logs`**: Shows real-time logs from all emulator containers
- **`emulators:status`**: Displays the current status of all emulator containers
- **`emulators:cleanup`**: Removes all emulator containers and volumes (use with caution)

## Configuration

### Environment Variables

Copy the required variables from `env.emulators.example` to your main `.env` file:

```bash
# Database emulator
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=dms_dev
DB_SSL=false

# Redis emulator
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# S3 emulator (MinIO)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=dms-storage
S3_REGION=us-east-1

# Azure Blob emulator
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;
AZURE_STORAGE_ACCOUNT=devstoreaccount1
AZURE_STORAGE_KEY=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==
```

### Docker Compose Configuration

The emulators use `docker-compose.emulators.yml` which defines:
- **PostgreSQL**: Port 5432, database `dms_dev`
- **Redis**: Port 6379, no authentication
- **MinIO (S3)**: Port 9000, web interface on port 9001
- **Azurite (Azure)**: Ports 10000-10002 for blob, queue, and table services

## Integration with DMS

### Database Operations
The emulators provide local versions of all external services:

- **PostgreSQL**: Full SQL database for development
- **Redis**: In-memory cache for sessions and temporary data
- **MinIO**: S3-compatible object storage for file uploads
- **Azurite**: Azure Blob Storage emulator for cloud storage testing

### Development Workflow

1. **Start emulators** before running your application
2. **Run migrations** to set up the database schema
3. **Seed data** using `npm run seed:run`
4. **Test your application** with real service interactions
5. **Stop emulators** when done to free up system resources

## Troubleshooting

### Common Issues

#### Port Conflicts
If you get port conflicts, check what's running on the required ports:
```bash
# Check what's using port 5432
netstat -an | grep 5432

# Check what's using port 9000
netstat -an | grep 9000
```

#### Docker Issues
If Docker containers fail to start:
```bash
# Check Docker status
docker --version
docker-compose --version

# Check container logs
npm run emulators:logs

# Clean up and restart
npm run emulators:cleanup
npm run emulators:start
```

#### Database Connection Issues
If your app can't connect to the database:
1. Verify emulators are running: `npm run emulators:status`
2. Check environment variables in `.env`
3. Ensure no firewall is blocking localhost connections
4. Try restarting emulators: `npm run emulators:restart`

### Reset Everything

If you need to start fresh:
```bash
# Stop and clean everything
npm run emulators:cleanup

# Start fresh
npm run emulators:start

# Run migrations and seed data
npm run seed:refresh
```

## Performance Considerations

### Resource Usage
- **PostgreSQL**: ~100-200MB RAM
- **Redis**: ~50-100MB RAM
- **MinIO**: ~100-200MB RAM
- **Azurite**: ~50-100MB RAM

**Total**: ~300-600MB RAM when all emulators are running

### Optimization Tips
- Stop emulators when not in use
- Use `emulators:stop` instead of `emulators:cleanup` for daily development
- Only run the emulators you need for your current work

## Best Practices

1. **Always start emulators** before running your application
2. **Use separate databases** for different development branches
3. **Seed realistic data** for comprehensive testing
4. **Clean up regularly** to prevent disk space issues
5. **Check logs** when troubleshooting issues

## Next Steps

- [Emulator Setup Guide](./emulator-setup.md) - Detailed setup instructions
- [Database Migrations](../adapters/secondary/database/migrations/README.md) - Database schema management
- [Seed Data CLI](../adapters/secondary/database/migrations/seed_data/README.md) - Populating test data
- [Performance Monitoring](../shared/observability/PERFORMANCE_USAGE.md) - Monitoring emulator performance
