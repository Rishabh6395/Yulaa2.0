-- CreateTable: letter_templates
-- Stores per-school custom HTML templates for PDF generation (fee invoices, letters, etc.)

CREATE TABLE "letter_templates" (
    "id"            TEXT         NOT NULL,
    "school_id"     TEXT,
    "name"          VARCHAR(200) NOT NULL,
    "template_type" VARCHAR(50)  NOT NULL DEFAULT 'fee_invoice',
    "html_content"  TEXT         NOT NULL,
    "is_default"    BOOLEAN      NOT NULL DEFAULT false,
    "is_active"     BOOLEAN      NOT NULL DEFAULT true,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "letter_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "letter_templates_school_id_template_type_idx" ON "letter_templates"("school_id", "template_type");

-- AddForeignKey
ALTER TABLE "letter_templates"
    ADD CONSTRAINT "letter_templates_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
