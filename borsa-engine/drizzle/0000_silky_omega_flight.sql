CREATE TYPE "public"."risk_level" AS ENUM('Low', 'Medium', 'High');--> statement-breakpoint
CREATE TYPE "public"."trade_signal" AS ENUM('Strong Swing Opportunity', 'Watch for Entry', 'Neutral', 'Weak Setup', 'Avoid');--> statement-breakpoint
CREATE TABLE "daily_ohlcv" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(10),
	"date" date NOT NULL,
	"open" numeric(12, 4) NOT NULL,
	"high" numeric(12, 4) NOT NULL,
	"low" numeric(12, 4) NOT NULL,
	"close" numeric(12, 4) NOT NULL,
	"adj_close" numeric(12, 4) NOT NULL,
	"volume" bigint NOT NULL,
	CONSTRAINT "unique_symbol_date" UNIQUE("symbol","date")
);
--> statement-breakpoint
CREATE TABLE "engine_signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(10),
	"analysis_date" date NOT NULL,
	"signal" "trade_signal" NOT NULL,
	"swing_score" integer,
	"confidence" integer,
	"risk" "risk_level" NOT NULL,
	"stop_loss" numeric(12, 4) NOT NULL,
	"target_1" numeric(12, 4) NOT NULL,
	"target_2" numeric(12, 4) NOT NULL,
	"entry_zone" varchar(50) NOT NULL,
	"value_trap_detected" boolean DEFAULT false,
	"fake_momentum_detected" boolean DEFAULT false,
	"catalyst_summary" text,
	"ai_confidence_score" numeric(5, 2),
	CONSTRAINT "unique_signal_symbol_date" UNIQUE("symbol","analysis_date")
);
--> statement-breakpoint
CREATE TABLE "fundamentals" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(10),
	"period_date" date NOT NULL,
	"pe_ratio" numeric(10, 4),
	"pb_ratio" numeric(10, 4),
	"ev_ebitda" numeric(10, 4),
	"revenue_growth_yoy" numeric(8, 4),
	"net_income_growth_yoy" numeric(8, 4),
	"debt_to_equity" numeric(10, 4),
	"fcf_positive" boolean,
	CONSTRAINT "unique_fund_symbol_date" UNIQUE("symbol","period_date")
);
--> statement-breakpoint
CREATE TABLE "insider_trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(10),
	"insider_name" varchar(255) NOT NULL,
	"transaction_type" varchar(50) NOT NULL,
	"shares_count" bigint NOT NULL,
	"transaction_price" numeric(12, 4),
	"transaction_date" date NOT NULL,
	"reported_date" date NOT NULL,
	CONSTRAINT "unique_insider_trade" UNIQUE("symbol","insider_name","transaction_date","shares_count")
);
--> statement-breakpoint
CREATE TABLE "paper_trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer,
	"symbol" varchar(10),
	"side" varchar(10) NOT NULL,
	"price" numeric(12, 4) NOT NULL,
	"shares_count" integer NOT NULL,
	"trade_date" timestamp DEFAULT now(),
	"status" varchar(20) DEFAULT 'OPEN'
);
--> statement-breakpoint
CREATE TABLE "paper_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" varchar(255),
	"balance" numeric(15, 4) DEFAULT '100000.00' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stocks" (
	"symbol" varchar(10) PRIMARY KEY NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"sector" varchar(100),
	"industry" varchar(100),
	"is_active" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"expo_push_token" varchar(255) NOT NULL,
	"device_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_devices_expo_push_token_unique" UNIQUE("expo_push_token"),
	CONSTRAINT "user_devices_device_id_unique" UNIQUE("device_id")
);
--> statement-breakpoint
ALTER TABLE "daily_ohlcv" ADD CONSTRAINT "daily_ohlcv_symbol_stocks_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."stocks"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engine_signals" ADD CONSTRAINT "engine_signals_symbol_stocks_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."stocks"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundamentals" ADD CONSTRAINT "fundamentals_symbol_stocks_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."stocks"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insider_trades" ADD CONSTRAINT "insider_trades_symbol_stocks_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."stocks"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_trades" ADD CONSTRAINT "paper_trades_wallet_id_paper_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."paper_wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_trades" ADD CONSTRAINT "paper_trades_symbol_stocks_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."stocks"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_wallets" ADD CONSTRAINT "paper_wallets_device_id_user_devices_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."user_devices"("device_id") ON DELETE cascade ON UPDATE no action;