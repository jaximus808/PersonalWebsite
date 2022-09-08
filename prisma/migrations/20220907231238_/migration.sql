-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "name" TEXT NOT NULL,
    "mediaLink" TEXT NOT NULL,
    "youtube" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "linkName" TEXT NOT NULL,
    "date" TEXT NOT NULL
);
INSERT INTO "new_Project" ("date", "description", "linkName", "mediaLink", "name", "youtube") SELECT "date", "description", "linkName", "mediaLink", "name", "youtube" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
