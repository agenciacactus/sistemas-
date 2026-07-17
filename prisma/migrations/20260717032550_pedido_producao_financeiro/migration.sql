-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FinancialEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "category" TEXT,
    "dueDate" DATETIME NOT NULL,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "agencyId" TEXT NOT NULL,
    "clientId" TEXT,
    "productionOrderId" TEXT,
    CONSTRAINT "FinancialEntry_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FinancialEntry" ("agencyId", "amountCents", "category", "clientId", "createdAt", "description", "dueDate", "id", "paidAt", "status", "type", "updatedAt") SELECT "agencyId", "amountCents", "category", "clientId", "createdAt", "description", "dueDate", "id", "paidAt", "status", "type", "updatedAt" FROM "FinancialEntry";
DROP TABLE "FinancialEntry";
ALTER TABLE "new_FinancialEntry" RENAME TO "FinancialEntry";
CREATE INDEX "FinancialEntry_agencyId_idx" ON "FinancialEntry"("agencyId");
CREATE INDEX "FinancialEntry_status_idx" ON "FinancialEntry"("status");
CREATE INDEX "FinancialEntry_productionOrderId_idx" ON "FinancialEntry"("productionOrderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
