-- SQLite
PRAGMA foreign_keys=ON;


INSERT INTO File (name,fullPath) VALUES ("test.txt","C:/test");
--shouldn't work name & fullpath should be unique, fail if true
--INSERT INTO File (name,fullPath) VALUES ("test.txt","C:/test");

INSERT INTO File (name,fullPath) VALUES ("test10.txt","C:/test");
INSERT INTO File (name,fullPath) VALUES ("mywork.doc","C:/work"); 
INSERT INTO File (name,fullPath) VALUES ("report.pdf","C:/work"); 
SELECT * FROM File;


--insert corresponding dirs
INSERT INTO Directory (name, fullPath) VALUES ("test","C:/");
INSERT INTO Directory (name, fullPath) VALUES ("work","C:/");
SELECT * FROM Directory;

--make corresponding foreign constraint 
UPDATE File 
SET dirId = (SELECT id from Directory where name = "test")
where fullPath="C:/test";

--test unique constraint for filedir (fail if true)
--INSERT INTO File (name,fullPath,dirId) VALUES ("test.txt","C:/testt",(SELECT id from Directory where name = "test"));

SELECT * FROM File;

--sample delete of directory and associated files
DELETE FROM Directory where name = "test" and fullPath = "C:/";
SELECT * FROM File;
SELECT * FROM Directory;

--testing vertices and edges
INSERT INTO Vertex (name,meta) VALUES ("meta stage",1);
INSERT INTO Vertex (name) VALUES ("stage 2");
INSERT INTO Vertex (name,meta) VALUES ("stage 3",0);
INSERT INTO Vertex (name) VALUES ("stage 4");
SELECT * FROM Vertex;

INSERT INTO Edge (name,startID,endID) VALUES ("2 - 3",(SELECT id from Vertex where name = "stage 2"),(SELECT id from Vertex where name = "stage 3"));
INSERT INTO Edge (name,startID,endID) VALUES ("3 - 4",(SELECT id from Vertex where name = "stage 3"),(SELECT id from Vertex where name = "stage 4"));
INSERT INTO Edge (name,startID,endID,inMeta) VALUES ("meta - 3",(SELECT id from Vertex where name = "meta stage"),(SELECT id from Vertex where name = "stage 3"),1);
INSERT INTO Edge (name,startID,endID,inMeta) VALUES ("meta - 4",(SELECT id from Vertex where name = "meta stage"),(SELECT id from Vertex where name = "stage 4"),1);
SELECT * FROM Edge JOIN Vertex as startV on startID=startV.id,Vertex as endV on endID=endV.id;


DELETE FROM File;
DELETE FROM Directory;
DELETE FROM Vertex;


SELECT * FROM File;
SELECT * FROM Directory;
SELECT * FROM Vertex;
SELECT * FROM Edge;