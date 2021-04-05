-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vertex" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "meta" BOOLEAN NOT NULL DEFAULT false,
    "x" INTEGER NOT NULL DEFAULT 0,
    "y" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_Vertex" ("id", "name", "meta") SELECT "id", "name", "meta" FROM "Vertex";
DROP TABLE "Vertex";
ALTER TABLE "new_Vertex" RENAME TO "Vertex";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
