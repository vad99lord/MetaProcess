-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Directory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "fullPath" TEXT NOT NULL,
    "valid" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Directory" ("id", "name", "fullPath") SELECT "id", "name", "fullPath" FROM "Directory";
DROP TABLE "Directory";
ALTER TABLE "new_Directory" RENAME TO "Directory";
CREATE UNIQUE INDEX "autoindex_Directory_1" ON "Directory"("name", "fullPath");
CREATE INDEX "dir_name" ON "Directory"("name");
CREATE TABLE "new_File" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "fullPath" TEXT NOT NULL,
    "dirId" INTEGER,
    "valid" BOOLEAN NOT NULL DEFAULT true,
    FOREIGN KEY ("dirId") REFERENCES "Directory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_File" ("id", "name", "fullPath", "dirId") SELECT "id", "name", "fullPath", "dirId" FROM "File";
DROP TABLE "File";
ALTER TABLE "new_File" RENAME TO "File";
CREATE UNIQUE INDEX "autoindex_File_2" ON "File"("name", "dirId");
CREATE UNIQUE INDEX "autoindex_File_1" ON "File"("name", "fullPath");
CREATE INDEX "file_name" ON "File"("name");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
