-- CreateEnum
CREATE TYPE "BountyStatus" AS ENUM ('OPEN', 'CLAIMED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "BountyDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateTable
CREATE TABLE "Bounty" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rewardAmount" DECIMAL(20,7) NOT NULL,
    "rewardAsset" TEXT NOT NULL DEFAULT 'XLM',
    "status" "BountyStatus" NOT NULL DEFAULT 'OPEN',
    "difficulty" "BountyDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "githubIssueUrl" TEXT,
    "githubIssueNumber" INTEGER,
    "githubRepoOwner" TEXT,
    "githubRepoName" TEXT,
    "githubLabels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contractAddress" TEXT,
    "escrowTxHash" TEXT,
    "releaseTxHash" TEXT,
    "platformFeeAmount" DECIMAL(20,7),
    "platformFeePaid" BOOLEAN NOT NULL DEFAULT false,
    "creatorId" TEXT NOT NULL,
    "claimantId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bounty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contributor" (
    "id" TEXT NOT NULL,
    "stellarAddress" TEXT NOT NULL,
    "githubUsername" TEXT,
    "githubId" INTEGER,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "bountiesCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" DECIMAL(20,7) NOT NULL DEFAULT 0,
    "reputationScore" INTEGER NOT NULL DEFAULT 0,
    "nonce" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contributor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "bountyId" TEXT NOT NULL,
    "contributorId" TEXT NOT NULL,
    "prUrl" TEXT,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "bountyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rewardPercent" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "bountyId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" TEXT,
    "resolution" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformFee" (
    "id" TEXT NOT NULL,
    "bountyId" TEXT NOT NULL,
    "amount" DECIMAL(20,7) NOT NULL,
    "asset" TEXT NOT NULL DEFAULT 'XLM',
    "txHash" TEXT,
    "collected" BOOLEAN NOT NULL DEFAULT false,
    "collectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bounty_githubIssueUrl_key" ON "Bounty"("githubIssueUrl");

-- CreateIndex
CREATE INDEX "Bounty_status_idx" ON "Bounty"("status");

-- CreateIndex
CREATE INDEX "Bounty_creatorId_idx" ON "Bounty"("creatorId");

-- CreateIndex
CREATE INDEX "Bounty_claimantId_idx" ON "Bounty"("claimantId");

-- CreateIndex
CREATE INDEX "Bounty_githubRepoOwner_githubRepoName_idx" ON "Bounty"("githubRepoOwner", "githubRepoName");

-- CreateIndex
CREATE UNIQUE INDEX "Contributor_stellarAddress_key" ON "Contributor"("stellarAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Contributor_githubUsername_key" ON "Contributor"("githubUsername");

-- CreateIndex
CREATE UNIQUE INDEX "Contributor_githubId_key" ON "Contributor"("githubId");

-- CreateIndex
CREATE INDEX "Contributor_stellarAddress_idx" ON "Contributor"("stellarAddress");

-- CreateIndex
CREATE INDEX "Contributor_githubUsername_idx" ON "Contributor"("githubUsername");

-- CreateIndex
CREATE INDEX "Contributor_reputationScore_idx" ON "Contributor"("reputationScore");

-- CreateIndex
CREATE INDEX "Submission_bountyId_idx" ON "Submission"("bountyId");

-- CreateIndex
CREATE INDEX "Submission_contributorId_idx" ON "Submission"("contributorId");

-- CreateIndex
CREATE INDEX "Milestone_bountyId_idx" ON "Milestone"("bountyId");

-- CreateIndex
CREATE INDEX "Dispute_bountyId_idx" ON "Dispute"("bountyId");

-- CreateIndex
CREATE INDEX "Dispute_raisedById_idx" ON "Dispute"("raisedById");

-- CreateIndex
CREATE INDEX "Notification_recipientId_read_idx" ON "Notification"("recipientId", "read");

-- CreateIndex
CREATE INDEX "WebhookDelivery_eventType_processed_idx" ON "WebhookDelivery"("eventType", "processed");

-- CreateIndex
CREATE INDEX "PlatformFee_collected_idx" ON "PlatformFee"("collected");

-- CreateIndex
CREATE INDEX "PlatformFee_bountyId_idx" ON "PlatformFee"("bountyId");

-- AddForeignKey
ALTER TABLE "Bounty" ADD CONSTRAINT "Bounty_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Contributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bounty" ADD CONSTRAINT "Bounty_claimantId_fkey" FOREIGN KEY ("claimantId") REFERENCES "Contributor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_bountyId_fkey" FOREIGN KEY ("bountyId") REFERENCES "Bounty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "Contributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_bountyId_fkey" FOREIGN KEY ("bountyId") REFERENCES "Bounty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_bountyId_fkey" FOREIGN KEY ("bountyId") REFERENCES "Bounty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "Contributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Contributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
