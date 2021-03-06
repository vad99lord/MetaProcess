CREATE TABLE Directory (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    fullPath TEXT NOT NULL,
    UNIQUE (name, fullPath)
);
--TODO: add index to name

CREATE TABLE File (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    fullPath TEXT NOT NULL,
    dirId INTEGER,
    UNIQUE (name, fullPath),
    UNIQUE (name, dirId),
    FOREIGN KEY (dirId)
        REFERENCES Directory(id)
            ON UPDATE SET NULL
            ON DELETE SET NULL
);
--TODO: add index to name


CREATE INDEX file_name ON File(name);
CREATE INDEX dir_name ON Directory(name);


CREATE TABLE Vertex (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    meta BOOLEAN NOT NULL DEFAULT False
);


--Composite foreign key
CREATE TABLE Edge (
    id INTEGER PRIMARY KEY,
    startID INTEGER NOT NULL,
    endID INTEGER NOT NULL,
    name TEXT NOT NULL,
    inMeta BOOLEAN NOT NULL DEFAULT False,
    FOREIGN KEY (startID)
        REFERENCES Vertex(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,
    FOREIGN KEY (endID)
        REFERENCES Vertex(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE                
)




