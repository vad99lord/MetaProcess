/*
  Warnings:

  - You are about to alter the column `x` on the `Vertex` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to alter the column `y` on the `Vertex` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vertex" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "meta" BOOLEAN NOT NULL DEFAULT false,
    "x" REAL NOT NULL DEFAULT 0,
    "y" REAL NOT NULL DEFAULT 0
);
INSERT INTO "new_Vertex" ("id", "name", "meta", "x", "y") SELECT "id", "name", "meta", "x", "y" FROM "Vertex";
DROP TABLE "Vertex";
ALTER TABLE "new_Vertex" RENAME TO "Vertex";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
