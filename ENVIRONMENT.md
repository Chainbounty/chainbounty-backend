# Environment Variables Documentation

This document describes all environment variables used by ChainBounty backend.

## Quick Start

Copy `.env.example` to `.env` and configure for your environment:

```bash
cp .env.example .env
```

## Required Variables

### Database

#### `DATABASE_URL`
**Required:** Yes  
**Type:** PostgreSQL connection string  
**Example:** `postgresql://postgres:password@localhost:5432/chainbounty?schema=public`  
**Description:** PostgreSQL database connection URL. Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA`

For local development with Docker Compose:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chainbounty?schema=public"
```

For production, use a managed database service with SSL:
```env
DATABASE_URL="postgresql://user:pass@host.com:5432/db?schema=public&sslmode=require"
```

### Server

#### `NODE_ENV`
**Required:** No  
**Type:** String  
**Default:** `development`  
**Options:** `development`, `production`, `test`  
**Example:** `NODE_ENV=production`  
**Description:** Application environment. Affects logging, error reporting, and performance optimizations.

#### `PORT`
**Required:** No  
**Type:** Integer  
**Default:** `3000`  
**Example:** `PORT=8080`  
**Description:** HTTP server port.

## Authentication

#### `JWT_SECRET`
**Required:** Yes  
**Type:** String  
**Example:** `JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"`  
**Description:** Secret key for signing JWT tokens. **Must be at least 32 characters.** Use a cryptographically secure random string in production.

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### `JWT_EXPIRES_IN`
**Required:** No  
**Type:** String  
**Default:** `7d`  
**Example:** `JWT_EXPIRES_IN="30d"`  
**Description:** JWT token expiration time. Accepts formats like `60s`, `10m`, `2h`, `7d`, `30d`.

## GitHub Integration

#### `GITHUB_WEBHOOK_SECRET`
**Required:** Only for GitHub webhook verification  
**Type:** String  
**Example:** `GITHUB_WEBHOOK_SECRET="your-github-webhook-secret"`  
**Description:** Secret for verifying GitHub webhook signatures. Set this in your GitHub webhook configuration.

If not set, webhook signature verification is skipped (not recommended for production).

## Stellar / Soroban

#### `STELLAR_HORIZON_URL`
**Required:** No  
**Type:** URL  
**Default:** `https://horizon-testnet.stellar.org`  
**Example:** `STELLAR_HORIZON_URL="https://horizon.stellar.org"`  
**Description:** Stellar Horizon API endpoint.

- **Testnet:** `https://horizon-testnet.stellar.org`
- **Mainnet:** `https://horizon.stellar.org`

#### `SOROBAN_CONTRACT_ADDRESS`
**Required:** Only for on-chain indexing  
**Type:** Stellar address  
**Example:** `SOROBAN_CONTRACT_ADDRESS="CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM"`  
**Description:** Soroban smart contract address for bounty escrow. Leave empty to disable indexer.

#### `STELLAR_NETWORK_PASSPHRASE`
**Required:** No  
**Type:** String  
**Default:** `Test SDF Network ; September 2015`  
**Example:** `STELLAR_NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"`  
**Description:** Stellar network passphrase.

- **Testnet:** `Test SDF Network ; September 2015`
- **Mainnet:** `Public Global Stellar Network ; September 2015`

#### `INDEXER_POLL_INTERVAL_MS`
**Required:** No  
**Type:** Integer (milliseconds)  
**Default:** `15000` (15 seconds)  
**Example:** `INDEXER_POLL_INTERVAL_MS=30000`  
**Description:** How often the Horizon indexer polls for new operations. Lower values = more frequent updates but higher API usage.

## Notifications

#### `NOTIFICATION_WEBHOOK_URL`
**Required:** No  
**Type:** URL  
**Example:** `NOTIFICATION_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"`  
**Description:** Webhook endpoint for delivering notifications. If not set, notifications are stored in the database but not delivered externally.

## Platform Configuration

#### `PLATFORM_FEE_PERCENTAGE`
**Required:** No  
**Type:** Decimal  
**Default:** `2.5`  
**Example:** `PLATFORM_FEE_PERCENTAGE="3.0"`  
**Description:** Platform fee percentage (0-100). Applied when bounties are approved.

## Environment-Specific Examples

### Development (.env)

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chainbounty?schema=public"
JWT_SECRET="dev-secret-minimum-32-characters-long-string"
JWT_EXPIRES_IN="7d"
STELLAR_HORIZON_URL="https://horizon-testnet.stellar.org"
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
SOROBAN_CONTRACT_ADDRESS=""
INDEXER_POLL_INTERVAL_MS=15000
GITHUB_WEBHOOK_SECRET=""
NOTIFICATION_WEBHOOK_URL=""
PLATFORM_FEE_PERCENTAGE="2.5"
```

### Testing (.env.test)

```env
NODE_ENV=test
PORT=3001
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/chainbounty_test?schema=public"
JWT_SECRET="test-secret-key-minimum-32-characters-long"
JWT_EXPIRES_IN="7d"
STELLAR_HORIZON_URL="https://horizon-testnet.stellar.org"
PLATFORM_FEE_PERCENTAGE="2.5"
```

### Production

```env
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://user:pass@prod-db.example.com:5432/chainbounty?schema=public&sslmode=require"
JWT_SECRET="<64-char-random-hex-string>"
JWT_EXPIRES_IN="30d"
STELLAR_HORIZON_URL="https://horizon.stellar.org"
STELLAR_NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
SOROBAN_CONTRACT_ADDRESS="<production-contract-address>"
INDEXER_POLL_INTERVAL_MS=30000
GITHUB_WEBHOOK_SECRET="<github-webhook-secret>"
NOTIFICATION_WEBHOOK_URL="https://api.example.com/notifications"
PLATFORM_FEE_PERCENTAGE="2.5"
```

## Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use strong secrets** - Minimum 32 characters, cryptographically random
3. **Rotate secrets regularly** - Especially `JWT_SECRET` and webhook secrets
4. **Use environment-specific secrets** - Different secrets for dev/staging/prod
5. **Enable SSL for database** - Add `?sslmode=require` to production `DATABASE_URL`
6. **Restrict database access** - Use firewall rules and minimal privileges
7. **Use secret management** - Consider AWS Secrets Manager, HashiCorp Vault, etc. for production

## Validation on Startup

The application validates critical environment variables on startup:

- `DATABASE_URL` - Must be a valid PostgreSQL connection string
- `JWT_SECRET` - Warning if shorter than 32 characters
- `PORT` - Must be a valid port number (1-65535)

Missing required variables will prevent the application from starting.

## Troubleshooting

### Database connection fails

Check:
- Database is running: `docker-compose ps postgres`
- Connection string is correct
- Database exists: `psql $DATABASE_URL -c "SELECT 1"`
- Migrations are applied: `npx prisma migrate status`

### JWT tokens invalid

- Ensure `JWT_SECRET` is the same across all instances
- Check token hasn't expired (`JWT_EXPIRES_IN`)
- Verify system clock is synchronized

### Indexer not working

- Check `SOROBAN_CONTRACT_ADDRESS` is set
- Verify Horizon URL is accessible
- Check logs for indexer errors

### Webhooks failing

- Verify `GITHUB_WEBHOOK_SECRET` matches GitHub settings
- Check webhook delivery logs in GitHub
- Ensure public URL is accessible from GitHub

## Additional Resources

- [Prisma Database Connection](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Stellar Documentation](https://developers.stellar.org)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [GitHub Webhooks](https://docs.github.com/en/webhooks)
