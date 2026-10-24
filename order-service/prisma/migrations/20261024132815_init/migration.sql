-- CreateTable
CREATE TABLE "orders" (
    "oid" SERIAL NOT NULL,
    "uid" INTEGER NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("oid")
);

-- CreateTable
CREATE TABLE "order_details" (
    "oid" INTEGER NOT NULL,
    "pid" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_details_pkey" PRIMARY KEY ("oid","pid")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" SERIAL NOT NULL,
    "aggregate_id" INTEGER NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "order_details" ADD CONSTRAINT "order_details_oid_fkey" FOREIGN KEY ("oid") REFERENCES "orders"("oid") ON DELETE CASCADE ON UPDATE CASCADE;
