DROP TABLE "app"."mfa_enrollments";--> statement-breakpoint
DROP TABLE "app"."mfa_factors";--> statement-breakpoint
DROP TABLE "app"."reauthentication_grants";--> statement-breakpoint
DROP TABLE "app"."mfa_recovery_codes";--> statement-breakpoint
ALTER TABLE "app"."sessions" DROP COLUMN "mfa_verified_at";--> statement-breakpoint
ALTER TABLE "app"."sessions" DROP COLUMN "mfa_last_active_at";
