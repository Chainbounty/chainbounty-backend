# Contributing to ChainBounty Backend

Thank you for your interest in contributing! This document provides guidelines for contributing to the ChainBounty backend.

## Development Setup

1. **Fork and clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/chainbounty-backend.git
cd chainbounty-backend
```

2. **Install dependencies**

```bash
npm install
```

3. **Start PostgreSQL**

```bash
docker-compose up -d postgres
```

4. **Set up environment**

```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Run migrations**

```bash
npx prisma migrate dev
```

6. **Start development server**

```bash
npm run dev
```

## Development Workflow

### Branch Naming

- Feature: `feature/short-description`
- Bug fix: `fix/short-description`
- Hotfix: `hotfix/short-description`
- Documentation: `docs/short-description`

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>: <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat: implement POST /bounties endpoint with validation
fix: correct JWT token expiration handling
docs: update API documentation for authentication
test: add integration tests for bounty lifecycle
```

## Code Standards

### TypeScript

- Use TypeScript strict mode
- Provide explicit return types for functions
- Avoid `any` type unless absolutely necessary
- Use interfaces for object shapes
- Use type aliases for union types

### Code Style

We use ESLint and Prettier for code formatting:

```bash
npm run lint       # Check for issues
npm run lint:fix   # Auto-fix issues
npm run format     # Format code
```

### File Organization

```
src/
├── controllers/    # Request handlers
├── lib/           # Business logic and utilities
├── middleware/    # Express middleware
├── routes/        # API route definitions
├── types/         # TypeScript type definitions
├── validators/    # Request validation
└── config/        # Configuration files
```

## Testing

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Generate coverage report
```

### Writing Tests

- Place tests in `tests/` directory
- Name test files with `.test.ts` suffix
- Use descriptive test names
- Test both success and error cases
- Aim for >80% code coverage

Example:
```typescript
describe('POST /api/v1/bounties', () => {
  it('should create a new bounty with valid data', async () => {
    const response = await request(app)
      .post('/api/v1/bounties')
      .send({ title: 'Test', description: 'Test', rewardAmount: 100 })
      .expect(201);
    
    expect(response.body.data).toHaveProperty('id');
  });
  
  it('should reject bounty creation with missing title', async () => {
    await request(app)
      .post('/api/v1/bounties')
      .send({ description: 'Test', rewardAmount: 100 })
      .expect(400);
  });
});
```

## Database Changes

### Creating Migrations

```bash
npx prisma migrate dev --name descriptive_name
```

### Migration Guidelines

- One migration per logical change
- Use descriptive names
- Test migrations on a copy of production data
- Never modify existing migrations
- Include both `up` and `down` logic when possible

## Pull Request Process

1. **Create a feature branch**

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes**
   - Write code
   - Add tests
   - Update documentation

3. **Run checks locally**

```bash
npm run lint
npm test
npm run build
```

4. **Commit your changes**

```bash
git add .
git commit -m "feat: add your feature"
```

5. **Push to your fork**

```bash
git push origin feature/your-feature-name
```

6. **Create a Pull Request**
   - Use the PR template
   - Link related issues
   - Request review from maintainers

### PR Review Criteria

- Code follows project style guidelines
- All tests pass
- Code coverage doesn't decrease
- Documentation is updated
- No merge conflicts
- Commit messages are clear

## API Documentation

When adding new endpoints, update the OpenAPI/Swagger documentation:

```typescript
/**
 * @openapi
 * /api/v1/your-endpoint:
 *   post:
 *     tags: [YourTag]
 *     summary: Brief description
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field: { type: string }
 *     responses:
 *       200:
 *         description: Success
 */
```

## Security

- Never commit sensitive data (keys, passwords, tokens)
- Use environment variables for configuration
- Validate all user input
- Use parameterized queries (Prisma handles this)
- Follow OWASP security guidelines
- Report security issues privately to maintainers

## Getting Help

- Check existing issues and PRs
- Read the documentation
- Ask questions in discussions
- Join our Discord community

## Code of Conduct

Be respectful, inclusive, and professional. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to ChainBounty! 🎉
