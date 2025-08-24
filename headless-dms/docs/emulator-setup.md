# Emulator Setup Guide

This guide explains how to set up and use the LocalStack (S3) and Azurite (Azure) emulators for local development and testing.

## Overview

The Document Management System supports multiple storage strategies:
- **Local Storage**: File system-based storage
- **S3 Storage**: AWS S3-compatible storage (with LocalStack emulator)
- **Azure Storage**: Azure Blob Storage (with Azurite emulator)

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ 
- npm or yarn package manager

## Quick Start

### 1. Start Emulators

```bash
# Start all emulators
npm run emulators:start

# Or manually with Docker Compose
docker-compose -f docker-compose.emulators.yml up -d
```

### 2. Verify Emulators are Running

```bash
# Check status
npm run emulators:status

# View logs
npm run emulators:logs
```

### 3. Test Health Endpoints

- **LocalStack**: http://127.0.0.1:4566/health
- **Azurite**: http://127.0.0.1:10000/health

## Emulator Details

### LocalStack (S3 Emulator)

**Configuration:**
- Endpoint: http://127.0.0.1:4566
- Port: 4566
- Access Key: `test`
- Secret Key: `test`
- Region: `us-east-1`
- Path Style: Enabled

**Features:**
- S3-compatible API
- Local file storage
- Support for all S3 operations
- Automatic bucket creation

**Environment Variables:**
```bash
USE_EMULATORS=true
LOCALSTACK_ENDPOINT=http://127.0.0.1:4566
LOCALSTACK_PORT=4566
LOCALSTACK_USE_PATH_STYLE=true
LOCALSTACK_ACCESS_KEY=test
LOCALSTACK_SECRET_KEY=test
LOCALSTACK_REGION=us-east-1
```

### Azurite (Azure Storage Emulator)

**Configuration:**
- Endpoint: http://127.0.0.1:10000
- Port: 10000
- Account: `devstoreaccount1`
- Key: `Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErC2
```

**Features:**
- Azure Blob Storage compatible API
- Local file storage
- Support for all blob operations
- Automatic container creation

**Environment Variables:**
```bash
USE_EMULATORS=true
AZURITE_ENDPOINT=http://127.0.0.1:10000
AZURITE_PORT=10000
AZURITE_ACCOUNT_NAME=devstoreaccount1
AZURITE_ACCOUNT_KEY=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErC2
```

## Environment Configuration

### 1. Create Environment File

Copy the example environment file:
```bash
cp env.emulators.example .env.emulators
```

### 2. Configure Environment Variables

Edit `.env.emulators`:
```bash
# Enable emulator mode
USE_EMULATORS=true

# Storage strategy selection
STORAGE_STRATEGY=s3  # or 'azure' or 'local'

# S3 configuration
S3_BUCKET_NAME=dms-test-bucket

# Azure configuration  
AZURE_CONTAINER_NAME=dms-test-container
```

### 3. Load Environment Variables

```bash
# Load emulator environment
source .env.emulators

# Or use with your application
NODE_ENV=development npm start
```

## Usage Examples

### S3 Storage Strategy

```typescript
import { S3StorageStrategy } from './src/adapters/secondary/storage/strategies/S3StorageStrategy.js';

const s3Strategy = new S3StorageStrategy({
  bucketName: 'dms-test-bucket',
  useEmulator: true,
  emulatorEndpoint: 'http://127.0.0.1:4566',
  accessKey: 'test',
  secretKey: 'test',
  region: 'us-east-1',
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: ['text/plain', 'image/jpeg', 'application/pdf'],
});

// Upload file
const result = await s3Strategy.upload('test.txt', Buffer.from('Hello World'), {
  contentType: 'text/plain',
  metadata: { author: 'test' },
});
```

### Azure Storage Strategy

```typescript
import { AzureStorageStrategy } from './src/adapters/secondary/storage/strategies/AzureStorageStrategy.js';

const azureStrategy = new AzureStorageStrategy({
  containerName: 'dms-test-container',
  useEmulator: true,
  emulatorEndpoint: 'http://127.0.0.1:10000',
  accountName: 'devstoreaccount1',
  accountKey: 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==',
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: ['text/plain', 'image/jpeg', 'application/pdf'],
});

// Upload file
const result = await azureStrategy.upload('test.txt', Buffer.from('Hello World'), {
  contentType: 'text/plain',
  metadata: { author: 'test' },
});
```

## Health Monitoring

### Emulator Health Controller

The system includes a health monitoring controller with REST endpoints:

```typescript
import { EmulatorHealthController } from './src/adapters/secondary/storage/emulators/EmulatorHealthController.js';

const healthController = new EmulatorHealthController();

// Health check endpoints
app.get('/api/emulators/health', healthController.getHealth.bind(healthController));
app.get('/api/emulators/health/localstack', healthController.getLocalStackHealth.bind(healthController));
app.get('/api/emulators/health/azurite', healthController.getAzuriteHealth.bind(healthController));
app.get('/api/emulators/config', healthController.getConfiguration.bind(healthController));
app.post('/api/emulators/health-check', healthController.performHealthCheck.bind(healthController));
app.get('/api/emulators/status', healthController.getStatusSummary.bind(healthController));
app.post('/api/emulators/start', healthController.startEmulatorManager.bind(healthController));
app.post('/api/emulators/stop', healthController.stopEmulatorManager.bind(healthController));
```

### Health Check Response

```json
{
  "status": "success",
  "data": {
    "emulatorMode": true,
    "overallHealth": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "localStack": {
      "status": "healthy",
      "endpoint": "http://127.0.0.1:4566",
      "responseTime": 45,
      "lastChecked": "2024-01-15T10:30:00.000Z"
    },
    "azurite": {
      "status": "healthy",
      "endpoint": "http://127.0.0.1:10000",
      "responseTime": 32,
      "lastChecked": "2024-01-15T10:30:00.000Z"
    },
    "metrics": {
      "totalChecks": 10,
      "successfulChecks": 10,
      "failedChecks": 0,
      "averageResponseTime": 38.5,
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

## Management Commands

### NPM Scripts

```bash
# Start emulators
npm run emulators:start

# Stop emulators
npm run emulators:stop

# Restart emulators
npm run emulators:restart

# View logs
npm run emulators:logs

# Check status
npm run emulators:status

# Clean up (remove volumes)
npm run emulators:cleanup
```

### Docker Compose Commands

```bash
# Start services
docker-compose -f docker-compose.emulators.yml up -d

# Stop services
docker-compose -f docker-compose.emulators.yml down

# View logs
docker-compose -f docker-compose.emulators.yml logs -f

# Check status
docker-compose -f docker-compose.emulators.yml ps

# Restart specific service
docker-compose -f docker-compose.emulators.yml restart localstack
docker-compose -f docker-compose.emulators.yml restart azurite
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   netstat -an | grep :4566
   netstat -an | grep :10000
   
   # Kill process or change ports in docker-compose.emulators.yml
   ```

2. **Docker Not Running**
   ```bash
   # Start Docker Desktop or Docker service
   # On Windows: Start Docker Desktop
   # On macOS: Start Docker Desktop
   # On Linux: sudo systemctl start docker
   ```

3. **Permission Issues**
   ```bash
   # On Linux, add user to docker group
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

4. **Emulator Health Check Fails**
   ```bash
   # Check if emulators are running
   docker ps
   
   # Check logs for errors
   docker-compose -f docker-compose.emulators.yml logs
   
   # Restart emulators
   npm run emulators:restart
   ```

### Debug Mode

Enable debug logging:
```bash
# Set debug environment variable
export DEBUG=1

# Start emulators with debug
docker-compose -f docker-compose.emulators.yml up -d
```

### Reset Emulators

```bash
# Stop and remove everything
npm run emulators:cleanup

# Start fresh
npm run emulators:start
```

## Performance Considerations

### LocalStack
- Uses local file system for storage
- Good for development and testing
- Not suitable for production load testing

### Azurite
- In-memory storage by default
- Fast for development
- Data is lost on container restart

### Health Check Intervals
- Default: 30 seconds
- Configurable via `EMULATOR_HEALTH_CHECK_INTERVAL`
- Lower values increase responsiveness but also resource usage

## Security Notes

⚠️ **Important**: These emulators are for development and testing only!

- Default credentials are hardcoded and publicly known
- No encryption or authentication
- Data is stored locally and may be accessible to other users
- Never use emulator credentials in production

## Integration with Storage Strategy Factory

The emulator configuration integrates with the storage strategy factory:

```typescript
import { StorageStrategyFactory } from './src/adapters/secondary/storage/StorageStrategyFactory.js';
import { EmulatorConfig } from './src/adapters/secondary/storage/emulators/EmulatorConfig.js';

const emulatorConfig = EmulatorConfig.getInstance();
const factory = new StorageStrategyFactory();

// Factory automatically detects emulator mode and configures strategies
const strategy = factory.createStrategy('s3', {
  useEmulator: emulatorConfig.isEmulatorMode(),
  emulatorEndpoint: emulatorConfig.getLocalStackConfig().endpoint,
  // ... other configuration
});
```

## Next Steps

1. **Test Storage Strategies**: Use the emulators to test S3 and Azure storage strategies
2. **Integration Testing**: Run end-to-end tests with emulators
3. **Performance Testing**: Benchmark storage operations
4. **Production Setup**: Configure real cloud storage when ready

For more information, see the main project documentation and the storage strategy implementations.
