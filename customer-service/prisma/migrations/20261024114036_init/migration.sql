-- CreateTable
CREATE TABLE "memberships" (
    "mid" INTEGER NOT NULL,
    "mname" VARCHAR(50) NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("mid")
);

-- CreateTable
CREATE TABLE "customers" (
    "uid" INTEGER NOT NULL,
    "fullname" VARCHAR(100) NOT NULL,
    "mid" INTEGER NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE UNIQUE INDEX "memberships_mname_key" ON "memberships"("mname");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_mid_fkey" FOREIGN KEY ("mid") REFERENCES "memberships"("mid") ON DELETE RESTRICT ON UPDATE CASCADE;
