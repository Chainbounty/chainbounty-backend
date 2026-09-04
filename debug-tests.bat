@echo off
echo Running single test file with verbose output...
echo.
call npx jest tests/bounty.test.ts --verbose --no-coverage
pause
