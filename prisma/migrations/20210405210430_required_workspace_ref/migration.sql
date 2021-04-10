/*
  Warnings:

  - Made the column `workspaceID` on table `Edge` required. The migration will fail if there are existing NULL values in that column.
  - Made the column `workspaceID` on table `Vertex` required. The migration will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Edge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startID" TEXT NOT NULL,
    "endID" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inMeta" BOOLEAN NOT NULL DEFAULT false,
    "workspaceID" TEXT NOT NULL,
    FOREIGN KEY ("endID") REFERENCES "Vertex" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("startID") REFERENCES "Vertex" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("workspaceID") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Edge" ("id", "startID", "endID", "name", "inMeta", "workspaceID") SELECT "id", "startID", "endID", "name", "inMeta", "workspaceID" FROM "Edge";
DROP TABLE "Edge";
ALTER TABLE "new_Edge" RENAME TO "Edge";
CREATE TABLE "new_Vertex" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "meta" BOOLEAN NOT NULL DEFAULT false,
    "x" REAL NOT NULL DEFAULT 0,
    "y" REAL NOT NULL DEFAULT 0,
    "workspaceID" TEXT NOT NULL,
    FOREIGN KEY ("workspaceID") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Vertex" ("id", "name", "meta", "x", "y", "workspaceID") SELECT "id", "name", "meta", "x", "y", "workspaceID" FROM "Vertex";
DROP TABLE "Vertex";
ALTER TABLE "new_Vertex" RENAME TO "Vertex";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
