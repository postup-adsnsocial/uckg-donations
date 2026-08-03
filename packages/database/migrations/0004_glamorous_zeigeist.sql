ALTER TABLE "churches" ADD COLUMN "address_line_1" text;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "address_line_2" text;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "country" text DEFAULT 'US' NOT NULL;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "address_line_1" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "address_line_2" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "country" text DEFAULT 'US' NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "notes" text;