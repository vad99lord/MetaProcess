-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isTreeMode" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Workspace" ("id", "name", "createdAt") SELECT "id", "name", "createdAt" FROM "Workspace";
DROP TABLE "Workspace";
ALTER TABLE "new_Workspace" RENAME TO "Workspace";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
