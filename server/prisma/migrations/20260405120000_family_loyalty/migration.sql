-- Family groups, idempotent loyalty grants, monthly leaderboard snapshots, reward tier metadata.

ALTER TABLE "User" ADD COLUMN "loyaltyPointsTotal" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "FamilyGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FamilyGroup_inviteCode_key" ON "FamilyGroup"("inviteCode");
CREATE INDEX "FamilyGroup_ownerUserId_idx" ON "FamilyGroup"("ownerUserId");
CREATE INDEX "FamilyGroup_totalPoints_idx" ON "FamilyGroup"("totalPoints");
CREATE UNIQUE INDEX "FamilyGroup_ownerUserId_key" ON "FamilyGroup"("ownerUserId");

ALTER TABLE "FamilyGroup" ADD CONSTRAINT "FamilyGroup_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FamilyGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyGroupMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FamilyGroupMember_userId_key" ON "FamilyGroupMember"("userId");
CREATE UNIQUE INDEX "FamilyGroupMember_groupId_userId_key" ON "FamilyGroupMember"("groupId", "userId");
CREATE INDEX "FamilyGroupMember_groupId_idx" ON "FamilyGroupMember"("groupId");

ALTER TABLE "FamilyGroupMember" ADD CONSTRAINT "FamilyGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyGroupMember" ADD CONSTRAINT "FamilyGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LoyaltyPointsGrant" (
    "id" TEXT NOT NULL,
    "paymentCheckoutId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT,
    "points" INTEGER NOT NULL,
    "amountUsdCents" INTEGER NOT NULL,
    "leaderboardMonth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyPointsGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoyaltyPointsGrant_paymentCheckoutId_key" ON "LoyaltyPointsGrant"("paymentCheckoutId");
CREATE INDEX "LoyaltyPointsGrant_userId_leaderboardMonth_idx" ON "LoyaltyPointsGrant"("userId", "leaderboardMonth");
CREATE INDEX "LoyaltyPointsGrant_groupId_leaderboardMonth_idx" ON "LoyaltyPointsGrant"("groupId", "leaderboardMonth");
CREATE INDEX "LoyaltyPointsGrant_leaderboardMonth_idx" ON "LoyaltyPointsGrant"("leaderboardMonth");

ALTER TABLE "LoyaltyPointsGrant" ADD CONSTRAINT "LoyaltyPointsGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LoyaltyPointsGrant" ADD CONSTRAINT "LoyaltyPointsGrant_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FamilyGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "LoyaltyLeaderboardSnapshot" (
    "id" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyLeaderboardSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoyaltyLeaderboardSnapshot_yearMonth_scope_subjectId_key" ON "LoyaltyLeaderboardSnapshot"("yearMonth", "scope", "subjectId");
CREATE INDEX "LoyaltyLeaderboardSnapshot_yearMonth_scope_rank_idx" ON "LoyaltyLeaderboardSnapshot"("yearMonth", "scope", "rank");

CREATE TABLE "LoyaltyRewardTier" (
    "id" TEXT NOT NULL,
    "rankStart" INTEGER NOT NULL,
    "rankEnd" INTEGER,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyRewardTier_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoyaltyRewardTier_sortOrder_idx" ON "LoyaltyRewardTier"("sortOrder");

INSERT INTO "LoyaltyRewardTier" ("id", "rankStart", "rankEnd", "label", "description", "sortOrder", "createdAt")
VALUES
  ('lrt_premier', 1, 1, 'Premier circle', 'Top placement this month — recognition tier (benefits structured separately).', 1, CURRENT_TIMESTAMP),
  ('lrt_gold', 2, 5, 'Gold circle', 'Strong monthly standing — recognition tier.', 2, CURRENT_TIMESTAMP),
  ('lrt_silver', 6, 20, 'Silver circle', 'Consistent activity — recognition tier.', 3, CURRENT_TIMESTAMP),
  ('lrt_member', 21, NULL, 'Member', 'All qualifying participants — thank you for choosing Zora-Walat.', 4, CURRENT_TIMESTAMP);
