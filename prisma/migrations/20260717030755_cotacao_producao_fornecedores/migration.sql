-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OUTRO',
    "contact" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "agencyId" TEXT NOT NULL,
    CONSTRAINT "Supplier_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "deadline" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "agencyId" TEXT NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "createdById" TEXT,
    CONSTRAINT "Quotation_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Quotation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quotation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'un',
    "spec" TEXT,
    "quotationId" TEXT NOT NULL,
    CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "channel" TEXT NOT NULL DEFAULT 'NONE',
    "sentAt" DATETIME,
    "respondedAt" DATETIME,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "leadTimeDays" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "quotationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    CONSTRAINT "SupplierQuote_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupplierQuote_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierQuoteLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitCents" INTEGER NOT NULL DEFAULT 0,
    "supplierQuoteId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    CONSTRAINT "SupplierQuoteLine_supplierQuoteId_fkey" FOREIGN KEY ("supplierQuoteId") REFERENCES "SupplierQuote" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupplierQuoteLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "QuotationItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "billingMethod" TEXT NOT NULL DEFAULT 'FATURADO_LIQUIDO',
    "bvPercent" REAL NOT NULL DEFAULT 0,
    "supplierCostCents" INTEGER NOT NULL DEFAULT 0,
    "bvCents" INTEGER NOT NULL DEFAULT 0,
    "clientTotalCents" INTEGER NOT NULL DEFAULT 0,
    "deliveryDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "agencyId" TEXT NOT NULL,
    "clientId" TEXT,
    "quotationId" TEXT NOT NULL,
    "supplierQuoteId" TEXT NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "ProductionOrder_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductionOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProductionOrder_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductionOrder_supplierQuoteId_fkey" FOREIGN KEY ("supplierQuoteId") REFERENCES "SupplierQuote" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductionOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Supplier_agencyId_idx" ON "Supplier"("agencyId");

-- CreateIndex
CREATE INDEX "Quotation_agencyId_idx" ON "Quotation"("agencyId");

-- CreateIndex
CREATE INDEX "Quotation_clientId_idx" ON "Quotation"("clientId");

-- CreateIndex
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");

-- CreateIndex
CREATE INDEX "SupplierQuote_quotationId_idx" ON "SupplierQuote"("quotationId");

-- CreateIndex
CREATE INDEX "SupplierQuote_supplierId_idx" ON "SupplierQuote"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierQuote_quotationId_supplierId_key" ON "SupplierQuote"("quotationId", "supplierId");

-- CreateIndex
CREATE INDEX "SupplierQuoteLine_supplierQuoteId_idx" ON "SupplierQuoteLine"("supplierQuoteId");

-- CreateIndex
CREATE INDEX "SupplierQuoteLine_itemId_idx" ON "SupplierQuoteLine"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierQuoteLine_supplierQuoteId_itemId_key" ON "SupplierQuoteLine"("supplierQuoteId", "itemId");

-- CreateIndex
CREATE INDEX "ProductionOrder_agencyId_idx" ON "ProductionOrder"("agencyId");

-- CreateIndex
CREATE INDEX "ProductionOrder_quotationId_idx" ON "ProductionOrder"("quotationId");

-- CreateIndex
CREATE INDEX "ProductionOrder_clientId_idx" ON "ProductionOrder"("clientId");
