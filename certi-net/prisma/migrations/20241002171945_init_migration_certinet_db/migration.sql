-- CreateTable
CREATE TABLE "Certifcate_db" (
    "id" SERIAL NOT NULL,
    "uuid_cert" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "date_creation" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "client_ip" TEXT NOT NULL,
    "client_auth" TEXT[],
    "cert_client_path" TEXT NOT NULL,
    "cert_server_path" TEXT NOT NULL,
    "nameserver" TEXT NOT NULL,
    "tenant" TEXT NOT NULL,

    CONSTRAINT "Certifcate_db_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Certifcate_db_uuid_cert_key" ON "Certifcate_db"("uuid_cert");
