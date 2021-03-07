/*
  Warnings:

  - The migration will change the primary key for the `Edge` table. If it partially fails, the table could be left without primary key constraint.
  - The migration will change the primary key for the `Vertex` table. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Edge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startID" TEXT NOT NULL,
    "endID" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inMeta" BOOLEAN NOT NULL DEFAULT false,
    FOREIGN KEY ("endID") REFERENCES "Vertex" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("startID") REFERENCES "Vertex" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Edge" ("id", "startID", "endID", "name", "inMeta") SELECT "id", "startID", "endID", "name", "inMeta" FROM "Edge";
DROP TABLE "Edge";
ALTER TABLE "new_Edge" RENAME TO "Edge";
CREATE TABLE "new_Vertex" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "meta" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Vertex" ("id", "name", "meta") SELECT "id", "name", "meta" FROM "Vertex";
DROP TABLE "Vertex";
ALTER TABLE "new_Vertex" RENAME TO "Vertex";
CREATE TABLE "new__DirectoryToEdge" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,
    FOREIGN KEY ("A") REFERENCES "Directory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("B") REFERENCES "Edge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new__DirectoryToEdge" ("A", "B") SELECT "A", "B" FROM "_DirectoryToEdge";
DROP TABLE "_DirectoryToEdge";
ALTER TABLE "new__DirectoryToEdge" RENAME TO "_DirectoryToEdge";
CREATE UNIQUE INDEX "_DirectoryToEdge_AB_unique" ON "_DirectoryToEdge"("A", "B");
CREATE INDEX "_DirectoryToEdge_B_index" ON "_DirectoryToEdge"("B");
CREATE TABLE "new__DirectoryToVertex" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,
    FOREIGN KEY ("A") REFERENCES "Directory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("B") REFERENCES "Vertex" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new__DirectoryToVertex" ("A", "B") SELECT "A", "B" FROM "_DirectoryToVertex";
DROP TABLE "_DirectoryToVertex";
ALTER TABLE "new__DirectoryToVertex" RENAME TO "_DirectoryToVertex";
CREATE UNIQUE INDEX "_DirectoryToVertex_AB_unique" ON "_DirectoryToVertex"("A", "B");
CREATE INDEX "_DirectoryToVertex_B_index" ON "_DirectoryToVertex"("B");
CREATE TABLE "new__EdgeToFile" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,
    FOREIGN KEY ("A") REFERENCES "Edge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("B") REFERENCES "File" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new__EdgeToFile" ("A", "B") SELECT "A", "B" FROM "_EdgeToFile";
DROP TABLE "_EdgeToFile";
ALTER TABLE "new__EdgeToFile" RENAME TO "_EdgeToFile";
CREATE UNIQUE INDEX "_EdgeToFile_AB_unique" ON "_EdgeToFile"("A", "B");
CREATE INDEX "_EdgeToFile_B_index" ON "_EdgeToFile"("B");
CREATE TABLE "new__FileToVertex" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,
    FOREIGN KEY ("A") REFERENCES "File" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("B") REFERENCES "Vertex" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new__FileToVertex" ("A", "B") SELECT "A", "B" FROM "_FileToVertex";
DROP TABLE "_FileToVertex";
ALTER TABLE "new__FileToVertex" RENAME TO "_FileToVertex";
CREATE UNIQUE INDEX "_FileToVertex_AB_unique" ON "_FileToVertex"("A", "B");
CREATE INDEX "_FileToVertex_B_index" ON "_FileToVertex"("B");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
