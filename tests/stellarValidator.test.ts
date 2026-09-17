import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import {
  isValidStellarAddress,
  validateStellarAddress,
  STELLAR_ADDRESS_REGEX,
} from '../src/validators/stellar.validator';
import { Keypair } from '@stellar/stellar-sdk';

describe('Stellar Address Validator Unit Tests', () => {
  const validStellarAddress = 'GCL6OXAMLD75BMTINA6EMRUDWK5THQUSHMYNLSNBCJAPZJHNYJTUNIBC';
  const devPlaceholderAddress = 'GDEV0000000000000000000000000000000000000000000000000000';

  it('should validate 56-character Stellar public keys starting with G', () => {
    expect(isValidStellarAddress(validStellarAddress)).toBe(true);
    expect(isValidStellarAddress(devPlaceholderAddress)).toBe(true);
    expect(validateStellarAddress(validStellarAddress)).toBe(true);

    const generatedKey = Keypair.random().publicKey();
    expect(isValidStellarAddress(generatedKey)).toBe(true);
    expect(STELLAR_ADDRESS_REGEX.test(generatedKey)).toBe(true);
  });

  it('should reject addresses that do not start with G', () => {
    const startsWithS = 'SCL6OXAMLD75BMTINA6EMRUDWK5THQUSHMYNLSNBCJAPZJHNYJTUNIBC';
    const startsWithC = 'CCL6OXAMLD75BMTINA6EMRUDWK5THQUSHMYNLSNBCJAPZJHNYJTUNIBC';
    const startsWithM = 'MCL6OXAMLD75BMTINA6EMRUDWK5THQUSHMYNLSNBCJAPZJHNYJTUNIBC';
    const startsWithB = 'BCL6OXAMLD75BMTINA6EMRUDWK5THQUSHMYNLSNBCJAPZJHNYJTUNIBC';
    const startsWithLowerG = 'gCL6OXAMLD75BMTINA6EMRUDWK5THQUSHMYNLSNBCJAPZJHNYJTUNIBC';

    expect(isValidStellarAddress(startsWithS)).toBe(false);
    expect(isValidStellarAddress(startsWithC)).toBe(false);
    expect(isValidStellarAddress(startsWithM)).toBe(false);
    expect(isValidStellarAddress(startsWithB)).toBe(false);
    expect(isValidStellarAddress(startsWithLowerG)).toBe(false);
  });

  it('should reject addresses with invalid length', () => {
    expect(isValidStellarAddress('')).toBe(false);
    expect(isValidStellarAddress('G')).toBe(false);
    expect(isValidStellarAddress('GCL6OXAMLD75BMTINA6EMRUDWK5THQUSHMYNLSNBCJAPZJHNYJTUNIB')).toBe(false);
    expect(isValidStellarAddress('GCL6OXAMLD75BMTINA6EMRUDWK5THQUSHMYNLSNBCJAPZJHNYJTUNIBC1')).toBe(false);
  });

  it('should reject addresses containing invalid characters', () => {
    const containsLowercase = 'GCL6OXAMLD75BMTINA6EMRUDWK5THQUSHMYNLSNBCJAPZJHNYJTUniBC';
    const containsSpecialChars = 'GCL6OXAMLD75BMTINA6EMRUDWK5THQUSHMYNLSNBCJAPZJHNYJTUNI!@';
    const containsSpaces = 'GCL6OXAMLD75BMTINA6EMRUDWK5THQUSHMYNLSNBCJAPZJHNYJTUNIB ';
    const containsDashes = 'GCL6OXAMLD75BMTINA6EMRUDWK5THQUSHMYNLSNBCJAPZJHNYJTUNI-C';

    expect(isValidStellarAddress(containsLowercase)).toBe(false);
    expect(isValidStellarAddress(containsSpecialChars)).toBe(false);
    expect(isValidStellarAddress(containsSpaces)).toBe(false);
    expect(isValidStellarAddress(containsDashes)).toBe(false);
  });

  it('should reject non-string inputs', () => {
    expect(isValidStellarAddress(null)).toBe(false);
    expect(isValidStellarAddress(undefined)).toBe(false);
    expect(isValidStellarAddress(1234567890)).toBe(false);
    expect(isValidStellarAddress(true)).toBe(false);
    expect(isValidStellarAddress(false)).toBe(false);
    expect(isValidStellarAddress({})).toBe(false);
    expect(isValidStellarAddress([])).toBe(false);
  });
});

describe('Stellar Address Validation on Endpoints', () => {
  const validAddress = 'GCL6OXAMLD75BMTINA6EMRUDWK5THQUSHMYNLSNBCJAPZJHNYJTUNIBC';
  const invalidAddress = 'INVALID_ADDRESS';

  afterAll(async () => {
    await prisma.contributor.deleteMany({
      where: {
        stellarAddress: {
          in: [validAddress, 'G' + 'B'.repeat(55)],
        },
      },
    });
  });

  describe('POST /api/v1/auth/challenge', () => {
    it('should return 400 when stellarAddress format is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/auth/challenge')
        .send({ stellarAddress: invalidAddress })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'stellarAddress',
            message: 'Invalid Stellar address format (must be 56 characters, starting with G)',
          }),
        ]),
      );
    });

    it('should return 200 when stellarAddress format is valid', async () => {
      const response = await request(app)
        .post('/api/v1/auth/challenge')
        .send({ stellarAddress: validAddress })
        .expect(200);

      expect(response.body.data).toHaveProperty('nonce');
    });
  });

  describe('POST /api/v1/auth/verify', () => {
    it('should return 400 when stellarAddress format is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify')
        .send({ stellarAddress: invalidAddress, signature: 'any_signature' })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'stellarAddress',
            message: 'Invalid Stellar address format (must be 56 characters, starting with G)',
          }),
        ]),
      );
    });
  });

  describe('GET /api/v1/contributors/address/:address', () => {
    it('should return 400 when address parameter is invalid format', async () => {
      const response = await request(app)
        .get(`/api/v1/contributors/address/${invalidAddress}`)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'address',
            message: 'Invalid Stellar address format (must be 56 characters, starting with G)',
          }),
        ]),
      );
    });
  });

  describe('POST /api/v1/contributors', () => {
    it('should return 400 when stellarAddress is invalid format', async () => {
      const response = await request(app)
        .post('/api/v1/contributors')
        .send({ stellarAddress: invalidAddress })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'stellarAddress',
            message: 'Invalid Stellar address format (must be 56 characters, starting with G)',
          }),
        ]),
      );
    });

    it('should return 201 when creating contributor with valid stellarAddress format', async () => {
      const testAddr = 'G' + 'B'.repeat(55);
      const response = await request(app)
        .post('/api/v1/contributors')
        .send({ stellarAddress: testAddr, displayName: 'Test Contributor' })
        .expect(201);

      expect(response.body.data.stellarAddress).toBe(testAddr);
    });
  });

  describe('Bounty endpoints Stellar address validation', () => {
    it('should return 400 on POST /api/v1/bounties with invalid creatorAddress', async () => {
      const response = await request(app)
        .post('/api/v1/bounties')
        .send({
          title: 'Test Bounty',
          description: 'Valid description for testing validation',
          rewardAmount: 50,
          creatorAddress: invalidAddress,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'creatorAddress',
            message: 'creatorAddress must be a valid Stellar public key (56 characters, starts with G)',
          }),
        ]),
      );
    });

    it('should return 400 on GET /api/v1/bounties with invalid creatorAddress filter', async () => {
      const response = await request(app)
        .get(`/api/v1/bounties?creatorAddress=${invalidAddress}`)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'creatorAddress',
            message: 'creatorAddress must be a valid Stellar public key (56 characters, starts with G)',
          }),
        ]),
      );
    });

    it('should return 400 on GET /api/v1/bounties with invalid claimantAddress filter', async () => {
      const response = await request(app)
        .get(`/api/v1/bounties?claimantAddress=${invalidAddress}`)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'claimantAddress',
            message: 'claimantAddress must be a valid Stellar public key (56 characters, starts with G)',
          }),
        ]),
      );
    });

    it('should return 200 on GET /api/v1/bounties with valid creatorAddress filter', async () => {
      const response = await request(app)
        .get(`/api/v1/bounties?creatorAddress=${validAddress}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });
  });
});
