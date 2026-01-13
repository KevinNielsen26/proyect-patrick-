-- 1. Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Crear Enum (opcional, o usar VARCHAR check)
CREATE TYPE "TransactionType" AS ENUM ('FAUCET_CLAIM', 'BET_SLOT', 'WIN_SLOT');

-- 3. Tabla Users
CREATE TABLE "User" (
                        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        "email" TEXT UNIQUE NOT NULL,
                        "password" TEXT NOT NULL,
                        "username" TEXT UNIQUE NOT NULL,
                        "balance" INTEGER DEFAULT 1000,
                        "lastFaucetClaim" TIMESTAMP,
                        "createdAt" TIMESTAMP DEFAULT NOW(),
                        "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 4. Tabla GameRound
CREATE TABLE "GameRound" (
                             "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                             "userId" UUID NOT NULL REFERENCES "User"("id"),
                             "gameType" TEXT DEFAULT 'SLOTS_3_REEL',
                             "betAmount" INTEGER NOT NULL,
                             "payout" INTEGER DEFAULT 0,
                             "result" JSONB NOT NULL, -- JSONB es mejor que JSON en Postgres
                             "clientSeed" TEXT,
                             "serverSeed" TEXT,
                             "createdAt" TIMESTAMP DEFAULT NOW()
);

-- 5. Tabla Transaction
CREATE TABLE "Transaction" (
                               "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                               "userId" UUID NOT NULL REFERENCES "User"("id"),
                               "amount" INTEGER NOT NULL,
                               "type" "TransactionType" NOT NULL,
                               "referenceId" UUID, -- ID del GameRound
                               "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Índices importantes
CREATE INDEX ON "Transaction"("userId");