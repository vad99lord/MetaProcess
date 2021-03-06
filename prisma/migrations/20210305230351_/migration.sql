-- CreateTable
CREATE TABLE "Directory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "fullPath" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Edge" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startID" INTEGER NOT NULL,
    "endID" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "inMeta" BOOLEAN NOT NULL DEFAULT false,
    FOREIGN KEY ("endID") REFERENCES "Vertex" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("startID") REFERENCES "Vertex" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "File" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "fullPath" TEXT NOT NULL,
    "dirId" INTEGER,
    FOREIGN KEY ("dirId") REFERENCES "Directory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vertex" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "meta" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "_DirectoryToEdge" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    FOREIGN KEY ("A") REFERENCES "Directory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("B") REFERENCES "Edge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_DirectoryToVertex" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    FOREIGN KEY ("A") REFERENCES "Directory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("B") REFERENCES "Vertex" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_EdgeToFile" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    FOREIGN KEY ("A") REFERENCES "Edge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("B") REFERENCES "File" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_FileToVertex" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    FOREIGN KEY ("A") REFERENCES "File" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("B") REFERENCES "Vertex" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "autoindex_Directory_1" ON "Directory"("name", "fullPath");

-- CreateIndex
CREATE INDEX "dir_name" ON "Directory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "autoindex_File_2" ON "File"("name", "dirId");

-- CreateIndex
CREATE UNIQUE INDEX "autoindex_File_1" ON "File"("name", "fullPath");

-- CreateIndex
CREATE INDEX "file_name" ON "File"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_DirectoryToEdge_AB_unique" ON "_DirectoryToEdge"("A", "B");

-- CreateIndex
CREATE INDEX "_DirectoryToEdge_B_index" ON "_DirectoryToEdge"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_DirectoryToVertex_AB_unique" ON "_DirectoryToVertex"("A", "B");

-- CreateIndex
CREATE INDEX "_DirectoryToVertex_B_index" ON "_DirectoryToVertex"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_EdgeToFile_AB_unique" ON "_EdgeToFile"("A", "B");

-- CreateIndex
CREATE INDEX "_EdgeToFile_B_index" ON "_EdgeToFile"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_FileToVertex_AB_unique" ON "_FileToVertex"("A", "B");

-- CreateIndex
CREATE INDEX "_FileToVertex_B_index" ON "_FileToVertex"("B");
