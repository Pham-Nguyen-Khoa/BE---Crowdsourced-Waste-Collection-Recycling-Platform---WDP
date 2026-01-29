-- AlterTable
CREATE SEQUENCE collector_id_seq;
ALTER TABLE "Collector" ALTER COLUMN "id" SET DEFAULT nextval('collector_id_seq');
ALTER SEQUENCE collector_id_seq OWNED BY "Collector"."id";
