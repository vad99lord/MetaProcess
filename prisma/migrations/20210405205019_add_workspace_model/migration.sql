-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Edge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startID" TEXT NOT NULL,
    "endID" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inMeta" BOOLEAN NOT NULL DEFAULT false,
    "workspaceID" TEXT,
    FOREIGN KEY ("endID") REFERENCES "Vertex" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("startID") REFERENCES "Vertex" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("workspaceID") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Edge" ("id", "startID", "endID", "name", "inMeta") SELECT "id", "startID", "endID", "name", "inMeta" FROM "Edge";
DROP TABLE "Edge";
ALTER TABLE "new_Edge" RENAME TO "Edge";
CREATE TABLE "new_Vertex" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "meta" BOOLEAN NOT NULL DEFAULT false,
    "x" REAL NOT NULL DEFAULT 0,
    "y" REAL NOT NULL DEFAULT 0,
    "workspaceID" TEXT,
    FOREIGN KEY ("workspaceID") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Vertex" ("id", "name", "meta", "x", "y") SELECT "id", "name", "meta", "x", "y" FROM "Vertex";
DROP TABLE "Vertex";
ALTER TABLE "new_Vertex" RENAME TO "Vertex";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
