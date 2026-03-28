-- CreateTable
CREATE TABLE "invite_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role_target" TEXT NOT NULL,
    "max_uses" INTEGER NOT NULL DEFAULT 1,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invite_codes_code_key" ON "invite_codes"("code");
CREATE INDEX "invite_codes_code_idx" ON "invite_codes"("code");
CREATE INDEX "invite_codes_active_idx" ON "invite_codes"("active");

-- AlterTable
ALTER TABLE "users" ADD COLUMN "invite_code_id" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_invite_code_id_fkey" FOREIGN KEY ("invite_code_id") REFERENCES "invite_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "users_invite_code_id_idx" ON "users"("invite_code_id");
