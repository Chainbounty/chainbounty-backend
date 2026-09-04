@echo off
echo ========================================
echo ChainBounty Backend Test Setup
echo ========================================

echo.
echo Step 1: Installing Prisma 5...
call npm install --save-dev prisma@5.15.0
call npm install @prisma/client@5.15.0

echo.
echo Step 2: Generating Prisma Client...
call npx prisma generate

echo.
echo Step 3: Dropping and recreating test database...
docker exec -it chainbounty-postgres psql -U postgres -c "DROP DATABASE IF EXISTS chainbounty_test;"
docker exec -it chainbounty-postgres psql -U postgres -c "CREATE DATABASE chainbounty_test;"

echo.
echo Step 4: Running migrations on test database...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chainbounty_test?schema=public
call npx prisma migrate deploy

echo.
echo Step 5: Verifying database tables...
docker exec -it chainbounty-postgres psql -U postgres -d chainbounty_test -c "\dt"

echo.
echo Step 6: Running tests...
call npm test

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo If tests failed, check:
echo 1. Docker container is running: docker ps
echo 2. Database exists: docker exec -it chainbounty-postgres psql -U postgres -l
echo 3. Tables exist: docker exec -it chainbounty-postgres psql -U postgres -d chainbounty_test -c "\dt"
echo.
pause
