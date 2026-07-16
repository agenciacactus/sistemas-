-- AlterTable
ALTER TABLE "Client" ADD COLUMN "portalToken" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Deliverable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'BRIEFING',
    "approval" TEXT NOT NULL DEFAULT 'PENDING',
    "clientNote" TEXT,
    "reviewedAt" DATETIME,
    "previewUrl" TEXT,
    "dueDate" DATETIME,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "agencyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    CONSTRAINT "Deliverable_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Deliverable_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Deliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Deliverable" ("agencyId", "clientId", "createdAt", "dueDate", "id", "priceCents", "projectId", "status", "title", "type", "updatedAt") SELECT "agencyId", "clientId", "createdAt", "dueDate", "id", "priceCents", "projectId", "status", "title", "type", "updatedAt" FROM "Deliverable";
DROP TABLE "Deliverable";
ALTER TABLE "new_Deliverable" RENAME TO "Deliverable";
CREATE INDEX "Deliverable_agencyId_idx" ON "Deliverable"("agencyId");
CREATE INDEX "Deliverable_clientId_idx" ON "Deliverable"("clientId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Client_portalToken_key" ON "Client"("portalToken");

