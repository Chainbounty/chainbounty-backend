@echo off
echo ========================================
echo ChainBounty Complete Database Setup
echo ========================================

echo.
echo Checking if .env exists...
if not exist .env (
    echo Creating .env from .env.example...
    copy .env.example .env
)

echo.
echo Step 1: Ensure Docker containers are running...
docker-compose up -d postgres

echo.
echo Step 2: Wait for PostgreSQL to be ready...
timeout /t 5 /nobreak

echo.
echo Step 3: Create development database...
docker exec -it chainbounty-postgres psql -U postgres -c "DROP DATABASE IF EXISTS chainbounty;"
docker exec -it chainbounty-postgres psql -U postgres -c "CREATE DATABASE chainbounty;"

echo.
echo Step 4: Create test database...
docker exec -it chainbounty-postgres psql -U postgres -c "DROP DATABASE IF EXISTS chainbounty_test;"
docker exec -it chainbounty-postgres psql -U postgres -c "CREATE DATABASE chainbounty_test;"

echo.
echo Step 5: Run initial migration on dev database...
call npx prisma migrate dev --name init

echo.
echo Step 6: Apply migrations to test database...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chainbounty_test?schema=public
call npx prisma migrate deploy

echo.
echo Step 7: Generate Prisma Client...
call npx prisma generate

echo.
echo Step 8: Verify tables in test database...
docker exec -it chainbounty-postgres psql -U postgres -d chainbounty_test -c "\dt"

echo.
echo Step 9: Running tests...
call npm test

echo.
echo ========================================
echo Setup Complete!
echo ========================================
pause
