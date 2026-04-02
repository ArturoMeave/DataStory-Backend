/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Snapshot` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Snapshot_userId_key" ON "Snapshot"("userId");
