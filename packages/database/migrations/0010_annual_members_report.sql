ALTER TABLE "report_files" DROP CONSTRAINT "report_files_type_valid";--> statement-breakpoint
ALTER TABLE "report_files" ADD CONSTRAINT "report_files_type_valid" CHECK ("report_files"."report_type" in ('detailed', 'member_totals', 'payment_methods', 'annual_members'));
