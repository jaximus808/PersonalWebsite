-- CreateTable
CREATE TABLE "Project" (
    "name" TEXT NOT NULL,
    "mediaLink" TEXT NOT NULL,
    "youtube" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "linkName" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");
