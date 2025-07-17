CREATE TABLE "attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_path" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "handsontable_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer,
	"col_headers" jsonb NOT NULL,
	"columns" jsonb NOT NULL,
	"rows_count" integer DEFAULT 10,
	"formulas" jsonb,
	"validation_rules" jsonb,
	"custom_styles" jsonb,
	"settings" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"invoice_type" varchar(20) NOT NULL,
	"issue_date" timestamp NOT NULL,
	"due_date" timestamp,
	"total_amount" numeric(15, 2) NOT NULL,
	"vat_amount" numeric(15, 2) DEFAULT '0',
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"file_path" varchar(500),
	"uploaded_by" varchar NOT NULL,
	"verified_by" varchar,
	"verified_at" timestamp,
	"tax_invoice_issued" boolean DEFAULT false,
	"tax_invoice_issued_date" timestamp,
	"tax_invoice_issued_by" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "item_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_item_id" integer NOT NULL,
	"invoice_id" integer,
	"received_quantity" numeric(10, 2) NOT NULL,
	"received_date" timestamp NOT NULL,
	"quality_check" boolean DEFAULT false,
	"quality_notes" text,
	"verified_by" varchar NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100),
	"specification" text,
	"unit" varchar(50) NOT NULL,
	"standard_price" numeric(15, 2),
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"action" varchar(100) NOT NULL,
	"changes" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(20) DEFAULT 'gray',
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "order_statuses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "order_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_name" varchar(100) NOT NULL,
	"template_type" varchar(50) NOT NULL,
	"fields_config" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"status_code" varchar(50) NOT NULL,
	"status_name" varchar(100) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "project_statuses_status_code_unique" UNIQUE("status_code")
);
--> statement-breakpoint
CREATE TABLE "project_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"type_code" varchar(50) NOT NULL,
	"type_name" varchar(100) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "project_types_type_code_unique" UNIQUE("type_code")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_name" varchar(255) NOT NULL,
	"project_code" varchar(100) NOT NULL,
	"client_name" varchar(255),
	"project_type" varchar(100),
	"location" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"total_budget" numeric(15, 2),
	"project_manager" varchar(100),
	"project_manager_name" varchar(100),
	"order_manager" varchar(100),
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "projects_project_code_unique" UNIQUE("project_code")
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"item_id" integer,
	"item_name" varchar(255) NOT NULL,
	"specification" text,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL,
	"total_amount" numeric(15, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"project_id" integer NOT NULL,
	"vendor_id" integer,
	"user_id" varchar NOT NULL,
	"template_id" integer,
	"order_date" timestamp NOT NULL,
	"delivery_date" timestamp,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0',
	"notes" text,
	"custom_fields" jsonb,
	"is_approved" boolean DEFAULT false,
	"approved_by" varchar,
	"approved_at" timestamp,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "purchase_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_fields" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer,
	"field_type" varchar(50) NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"label" varchar(255) NOT NULL,
	"placeholder" varchar(255),
	"required" boolean DEFAULT false,
	"validation" jsonb,
	"options" jsonb,
	"grid_position" jsonb NOT NULL,
	"section_name" varchar(100) NOT NULL,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer,
	"version_number" varchar(20) NOT NULL,
	"changes" jsonb,
	"template_config" jsonb NOT NULL,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ui_terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"term_key" varchar(100) NOT NULL,
	"term_value" varchar(255) NOT NULL,
	"category" varchar(50) DEFAULT 'general',
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ui_terms_term_key_unique" UNIQUE("term_key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"position" varchar,
	"phone_number" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"business_number" varchar(50),
	"industry" varchar(100),
	"representative" varchar(100),
	"contact" varchar(100),
	"contact_person" varchar(100),
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"address" text,
	"memo" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "verification_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"invoice_id" integer,
	"item_receipt_id" integer,
	"action" varchar(100) NOT NULL,
	"details" text,
	"performed_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handsontable_configs" ADD CONSTRAINT "handsontable_configs_template_id_order_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."order_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_receipts" ADD CONSTRAINT "item_receipts_order_item_id_purchase_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."purchase_order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_receipts" ADD CONSTRAINT "item_receipts_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_history" ADD CONSTRAINT "order_history_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_history" ADD CONSTRAINT "order_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_template_id_order_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."order_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_fields" ADD CONSTRAINT "template_fields_template_id_order_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."order_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_template_id_order_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."order_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_item_receipt_id_item_receipts_id_fk" FOREIGN KEY ("item_receipt_id") REFERENCES "public"."item_receipts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");