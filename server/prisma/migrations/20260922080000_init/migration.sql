-- CreateExtension

CREATE EXTENSION IF NOT EXISTS citext;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "identification_level" AS ENUM ('BASIC', 'LEGAL');

-- CreateEnum
CREATE TYPE "flag" AS ENUM ('AUTO', 'ONLINE', 'PHYSICAL', 'PLANNED');

-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('PREPARATION', 'EXECUTION', 'OPERATION', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "case_internal_status" AS ENUM ('DRAFT', 'SUBMITTED', 'REGISTERED', 'IN_EVALUATION', 'WAITING_ADDITIONAL_INFO', 'ASSIGNED_FOR_EXECUTION', 'UNDER_REVIEW', 'INTER_AGENCY_COORDINATION', 'RESULT_BEING_PREPARED', 'COMPLETED', 'REJECTED', 'WITHDRAWN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "investor_visible_status" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_CONSIDERATION', 'WAITING_YOUR_RESPONSE', 'AT_INSTITUTION', 'RESULT_BEING_PREPARED', 'COMPLETED', 'REJECTED', 'WITHDRAWN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "representation_authority" AS ENUM ('VIEW', 'PREPARE', 'SIGN');

-- CreateEnum
CREATE TYPE "document_source" AS ENUM ('UPLOADED', 'GENERATED');

-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('PORTAL', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "rule_set_kind" AS ENUM ('KYA', 'INCENTIVE', 'RISK', 'ROUTE', 'FLAG', 'CASE_ASSIGNMENT', 'SIZE_THRESHOLD', 'INACTIVITY_THRESHOLD');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('INVESTOR', 'CASE_MANAGER', 'SUPERVISOR', 'INSTITUTION_REP', 'EVALUATOR', 'OMBUDSMAN_OFFICER', 'CONTENT_MANAGER', 'ANALYST', 'SYSADMIN');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('EMAIL', 'ASAN_LOGIN');

-- CreateEnum
CREATE TYPE "project_size_category" AS ENUM ('SMALL', 'LARGE');

-- CreateEnum
CREATE TYPE "workflow_kind" AS ENUM ('STANDARD');

-- CreateEnum
CREATE TYPE "currency" AS ENUM ('AZN', 'USD', 'EUR');

-- CreateEnum
CREATE TYPE "classification_kind" AS ENUM ('SECTOR', 'ACTIVITY', 'REGION', 'COUNTRY', 'ZONE_PARK', 'INSTITUTION', 'DOCUMENT_TYPE');

-- CreateEnum
CREATE TYPE "cms_status" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "payment_kind" AS ENUM ('STATE_FEE', 'PARTNER_SERVICE');

-- CreateEnum
CREATE TYPE "application_source" AS ENUM ('PASSPORT_STAGE', 'OPPORTUNITY_CARD', 'NEW_APPLICATION');

-- CreateEnum
CREATE TYPE "document_link_object" AS ENUM ('PROFILE', 'PROJECT', 'APPLICATION');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" TEXT,
    "identification_level" "identification_level" NOT NULL DEFAULT 'BASIC',
    "locale" VARCHAR(8) NOT NULL DEFAULT 'az',
    "consents" JSONB NOT NULL DEFAULT '{}',
    "consent_version" TEXT,
    "consented_at" TIMESTAMPTZ(6),
    "auth_provider" "auth_provider" NOT NULL DEFAULT 'EMAIL',
    "email_verified_at" TIMESTAMPTZ(6),
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" TEXT,
    "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
    "institution_id" UUID,
    "pep_sanctions_status" TEXT,
    "pep_sanctions_checked_at" TIMESTAMPTZ(6),
    "pep_sanctions_list_version" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "user_role" NOT NULL,
    "valid_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMPTZ(6),
    "granted_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "country_id" UUID,
    "sector_id" UUID,
    "activity_area_id" UUID,
    "contacts" JSONB NOT NULL DEFAULT '{}',
    "company_name" TEXT,
    "company_country_id" UUID,
    "company_reg_id" TEXT,
    "tax_id" TEXT,
    "company_activity" TEXT,
    "ubo_structure" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_versions" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "representations" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "representative_user_id" UUID NOT NULL,
    "authority" "representation_authority" NOT NULL,
    "power_of_attorney_document_id" UUID,
    "valid_from" TIMESTAMPTZ(6) NOT NULL,
    "valid_to" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "representations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sector_id" UUID,
    "territory_id" UUID,
    "volume_amount" DECIMAL(18,2) NOT NULL,
    "volume_currency" "currency" NOT NULL,
    "size_category" "project_size_category" NOT NULL,
    "company_ref" TEXT,
    "permanent_case_manager_id" UUID,
    "created_by" UUID NOT NULL,
    "status" "project_status" NOT NULL DEFAULT 'PREPARATION',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stages" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "procedure_id" UUID NOT NULL,
    "flag" "flag" NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "expected_duration_days" INTEGER,
    "actual_started_at" TIMESTAMPTZ(6),
    "actual_completed_at" TIMESTAMPTZ(6),
    "application_id" UUID,
    "is_not_applicable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kya_results" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "project_id" UUID,
    "input_parameters" JSONB NOT NULL,
    "procedures" JSONB NOT NULL,
    "rule_set_id" UUID NOT NULL,
    "rule_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kya_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "public_number" TEXT,
    "type_id" UUID NOT NULL,
    "workflow" "workflow_kind" NOT NULL DEFAULT 'STANDARD',
    "snapshot" JSONB,
    "project_id" UUID,
    "profile_id" UUID,
    "source" "application_source" NOT NULL DEFAULT 'NEW_APPLICATION',
    "withdrawn_at" TIMESTAMPTZ(6),
    "withdrawal_reason" TEXT,
    "submitted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "internal_status" "case_internal_status" NOT NULL DEFAULT 'REGISTERED',
    "case_manager_id" UUID,
    "sla_due_at" TIMESTAMPTZ(6),
    "registered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),
    "paused_at" TIMESTAMPTZ(6),
    "escalated_at" TIMESTAMPTZ(6),
    "final_result" JSONB,
    "sector_id" UUID,
    "region_id" UUID,
    "institution_id" UUID,
    "reopened_at" TIMESTAMPTZ(6),
    "reopened_by" UUID,
    "reopen_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "assignee_user_id" UUID,
    "due_at" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL,
    "opinion" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_documents" (
    "task_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,

    CONSTRAINT "task_documents_pkey" PRIMARY KEY ("task_id","document_id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "route" TEXT NOT NULL,
    "evaluator_id" UUID,
    "opinion" TEXT,
    "criteria_used" JSONB,
    "list_version" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "due_at" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "type_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "valid_until" TIMESTAMPTZ(6),
    "source" "document_source" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_name" TEXT,
    "mime_type" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_links" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "object_type" "document_link_object" NOT NULL,
    "object_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "sender_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "message_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("message_id","document_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "channel" "notification_channel" NOT NULL,
    "delivery_result" TEXT NOT NULL DEFAULT 'pending',
    "read_at" TIMESTAMPTZ(6),
    "body" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_sets" (
    "id" UUID NOT NULL,
    "kind" "rule_set_kind" NOT NULL,
    "version" TEXT NOT NULL,
    "effective_at" TIMESTAMPTZ(6) NOT NULL,
    "approved_by" UUID,
    "body" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "kind" "payment_kind" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "currency" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'external',
    "receipt_document_id" UUID,
    "project_id" UUID,
    "application_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_records" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "before" JSONB,
    "after" JSONB,
    "object_type" TEXT NOT NULL,
    "object_id" TEXT NOT NULL,

    CONSTRAINT "audit_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classifications" (
    "id" UUID NOT NULL,
    "kind" "classification_kind" NOT NULL,
    "code" TEXT NOT NULL,
    "names" JSONB NOT NULL,
    "parent_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedures" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "names" JSONB NOT NULL,
    "institution_id" UUID NOT NULL,
    "flag" "flag" NOT NULL,
    "expected_duration_days" INTEGER,
    "fee_amount" DECIMAL(18,2),
    "fee_currency" "currency",
    "legal_basis" TEXT,
    "e_service_url" TEXT,
    "application_type_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_documents" (
    "procedure_id" UUID NOT NULL,
    "document_type_id" UUID NOT NULL,

    CONSTRAINT "procedure_documents_pkey" PRIMARY KEY ("procedure_id","document_type_id")
);

-- CreateTable
CREATE TABLE "procedure_dependencies" (
    "procedure_id" UUID NOT NULL,
    "depends_on_procedure_id" UUID NOT NULL,

    CONSTRAINT "procedure_dependencies_pkey" PRIMARY KEY ("procedure_id","depends_on_procedure_id")
);

-- CreateTable
CREATE TABLE "application_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "names" JSONB NOT NULL,
    "workflow" "workflow_kind" NOT NULL DEFAULT 'STANDARD',
    "identification_level" "identification_level" NOT NULL,
    "requires_evaluation" BOOLEAN NOT NULL DEFAULT false,
    "form_schema" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "application_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_type_documents" (
    "application_type_id" UUID NOT NULL,
    "document_type_id" UUID NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "application_type_documents_pkey" PRIMARY KEY ("application_type_id","document_type_id")
);

-- CreateTable
CREATE TABLE "workflow_statuses" (
    "id" UUID NOT NULL,
    "workflow" "workflow_kind" NOT NULL DEFAULT 'STANDARD',
    "internal_status" "case_internal_status" NOT NULL,
    "investor_visible_status" "investor_visible_status" NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "sla_working_days" INTEGER,
    "pause_sla_on_this_status" BOOLEAN NOT NULL DEFAULT false,
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "workflow_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_transitions" (
    "id" UUID NOT NULL,
    "workflow" "workflow_kind" NOT NULL DEFAULT 'STANDARD',
    "from_status" "case_internal_status" NOT NULL,
    "to_status" "case_internal_status" NOT NULL,
    "required_role" "user_role",
    "requires_reason" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "workflow_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_content" (
    "id" UUID NOT NULL,
    "page_key" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "body" JSONB NOT NULL,
    "status" "cms_status" NOT NULL DEFAULT 'DRAFT',
    "owner_user_id" UUID,
    "effective_at" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),
    "scheduled_at" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cms_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_content_versions" (
    "id" UUID NOT NULL,
    "content_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" JSONB NOT NULL,
    "body" JSONB NOT NULL,
    "status" "cms_status" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cms_content_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "role" "user_role",
    "locale" VARCHAR(8) NOT NULL,
    "channel" "notification_channel" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_sessions" (
    "id" UUID NOT NULL,
    "email" CITEXT,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "locale" VARCHAR(8) NOT NULL DEFAULT 'az',
    "converted_user_id" UUID,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_institution_id_idx" ON "users"("institution_id");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "user_roles_user_id_role_idx" ON "user_roles"("user_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profile_versions_profile_id_version_key" ON "profile_versions"("profile_id", "version");

-- CreateIndex
CREATE INDEX "representations_profile_id_idx" ON "representations"("profile_id");

-- CreateIndex
CREATE INDEX "representations_representative_user_id_idx" ON "representations"("representative_user_id");

-- CreateIndex
CREATE INDEX "projects_profile_id_idx" ON "projects"("profile_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_permanent_case_manager_id_idx" ON "projects"("permanent_case_manager_id");

-- CreateIndex
CREATE UNIQUE INDEX "stages_application_id_key" ON "stages"("application_id");

-- CreateIndex
CREATE INDEX "stages_project_id_sort_order_idx" ON "stages"("project_id", "sort_order");

-- CreateIndex
CREATE INDEX "kya_results_profile_id_idx" ON "kya_results"("profile_id");

-- CreateIndex
CREATE INDEX "kya_results_project_id_idx" ON "kya_results"("project_id");

-- CreateIndex
CREATE INDEX "kya_results_rule_set_id_idx" ON "kya_results"("rule_set_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_public_number_key" ON "applications"("public_number");

-- CreateIndex
CREATE INDEX "applications_profile_id_created_at_idx" ON "applications"("profile_id", "created_at");

-- CreateIndex
CREATE INDEX "applications_project_id_created_at_idx" ON "applications"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "applications_type_id_idx" ON "applications"("type_id");

-- CreateIndex
CREATE UNIQUE INDEX "cases_application_id_key" ON "cases"("application_id");

-- CreateIndex
CREATE INDEX "cases_case_manager_id_internal_status_sla_due_at_idx" ON "cases"("case_manager_id", "internal_status", "sla_due_at");

-- CreateIndex
CREATE INDEX "cases_internal_status_sla_due_at_idx" ON "cases"("internal_status", "sla_due_at");

-- CreateIndex
CREATE INDEX "cases_institution_id_idx" ON "cases"("institution_id");

-- CreateIndex
CREATE INDEX "tasks_institution_id_due_at_idx" ON "tasks"("institution_id", "due_at");

-- CreateIndex
CREATE INDEX "tasks_assignee_user_id_due_at_idx" ON "tasks"("assignee_user_id", "due_at");

-- CreateIndex
CREATE INDEX "tasks_case_id_status_idx" ON "tasks"("case_id", "status");

-- CreateIndex
CREATE INDEX "evaluations_case_id_idx" ON "evaluations"("case_id");

-- CreateIndex
CREATE INDEX "evaluations_evaluator_id_status_idx" ON "evaluations"("evaluator_id", "status");

-- CreateIndex
CREATE INDEX "evaluations_user_id_idx" ON "evaluations"("user_id");

-- CreateIndex
CREATE INDEX "documents_type_id_idx" ON "documents"("type_id");

-- CreateIndex
CREATE INDEX "documents_valid_until_idx" ON "documents"("valid_until");

-- CreateIndex
CREATE INDEX "document_links_object_type_object_id_idx" ON "document_links"("object_type", "object_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_links_document_id_object_type_object_id_key" ON "document_links"("document_id", "object_type", "object_id");

-- CreateIndex
CREATE INDEX "messages_application_id_created_at_idx" ON "messages"("application_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "rule_sets_kind_effective_at_idx" ON "rule_sets"("kind", "effective_at");

-- CreateIndex
CREATE UNIQUE INDEX "rule_sets_kind_version_key" ON "rule_sets"("kind", "version");

-- CreateIndex
CREATE INDEX "payments_project_id_idx" ON "payments"("project_id");

-- CreateIndex
CREATE INDEX "payments_application_id_idx" ON "payments"("application_id");

-- CreateIndex
CREATE INDEX "audit_records_object_type_object_id_occurred_at_idx" ON "audit_records"("object_type", "object_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_records_actor_user_id_occurred_at_idx" ON "audit_records"("actor_user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "classifications_kind_is_active_sort_order_idx" ON "classifications"("kind", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "classifications_kind_code_key" ON "classifications"("kind", "code");

-- CreateIndex
CREATE UNIQUE INDEX "procedures_code_key" ON "procedures"("code");

-- CreateIndex
CREATE INDEX "procedures_institution_id_idx" ON "procedures"("institution_id");

-- CreateIndex
CREATE INDEX "procedures_flag_idx" ON "procedures"("flag");

-- CreateIndex
CREATE UNIQUE INDEX "application_types_code_key" ON "application_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_statuses_workflow_internal_status_key" ON "workflow_statuses"("workflow", "internal_status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_transitions_workflow_from_status_to_status_key" ON "workflow_transitions"("workflow", "from_status", "to_status");

-- CreateIndex
CREATE UNIQUE INDEX "cms_content_slug_key" ON "cms_content"("slug");

-- CreateIndex
CREATE INDEX "cms_content_page_key_status_idx" ON "cms_content"("page_key", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cms_content_versions_content_id_version_key" ON "cms_content_versions"("content_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_event_type_role_locale_channel_key" ON "notification_templates"("event_type", "role", "locale", "channel");

-- CreateIndex
CREATE INDEX "guest_sessions_email_idx" ON "guest_sessions"("email");

-- CreateIndex
CREATE INDEX "guest_sessions_expires_at_idx" ON "guest_sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "classifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "classifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "classifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_activity_area_id_fkey" FOREIGN KEY ("activity_area_id") REFERENCES "classifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_company_country_id_fkey" FOREIGN KEY ("company_country_id") REFERENCES "classifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_versions" ADD CONSTRAINT "profile_versions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "representations" ADD CONSTRAINT "representations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "representations" ADD CONSTRAINT "representations_representative_user_id_fkey" FOREIGN KEY ("representative_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "representations" ADD CONSTRAINT "representations_power_of_attorney_document_id_fkey" FOREIGN KEY ("power_of_attorney_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "classifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "classifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_permanent_case_manager_id_fkey" FOREIGN KEY ("permanent_case_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stages" ADD CONSTRAINT "stages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stages" ADD CONSTRAINT "stages_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stages" ADD CONSTRAINT "stages_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kya_results" ADD CONSTRAINT "kya_results_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kya_results" ADD CONSTRAINT "kya_results_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kya_results" ADD CONSTRAINT "kya_results_rule_set_id_fkey" FOREIGN KEY ("rule_set_id") REFERENCES "rule_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "application_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_case_manager_id_fkey" FOREIGN KEY ("case_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_reopened_by_fkey" FOREIGN KEY ("reopened_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "classifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "classifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "classifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "classifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_documents" ADD CONSTRAINT "task_documents_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_documents" ADD CONSTRAINT "task_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "classifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_sets" ADD CONSTRAINT "rule_sets_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_receipt_document_id_fkey" FOREIGN KEY ("receipt_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_records" ADD CONSTRAINT "audit_records_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classifications" ADD CONSTRAINT "classifications_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "classifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "classifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_application_type_id_fkey" FOREIGN KEY ("application_type_id") REFERENCES "application_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_documents" ADD CONSTRAINT "procedure_documents_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_documents" ADD CONSTRAINT "procedure_documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "classifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_dependencies" ADD CONSTRAINT "procedure_dependencies_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_dependencies" ADD CONSTRAINT "procedure_dependencies_depends_on_procedure_id_fkey" FOREIGN KEY ("depends_on_procedure_id") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_type_documents" ADD CONSTRAINT "application_type_documents_application_type_id_fkey" FOREIGN KEY ("application_type_id") REFERENCES "application_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_type_documents" ADD CONSTRAINT "application_type_documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "classifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_content" ADD CONSTRAINT "cms_content_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_content_versions" ADD CONSTRAINT "cms_content_versions_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "cms_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_sessions" ADD CONSTRAINT "guest_sessions_converted_user_id_fkey" FOREIGN KEY ("converted_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Extra integrity objects that Prisma does not emit from schema.prisma.
-- Applied as part of the init migration. PLAN §5.1 items 4–7.

-- Z-02: every application links to a project XOR a profile (TZ §3.1).
ALTER TABLE applications
  ADD CONSTRAINT applications_z02_link
  CHECK ((project_id IS NULL) <> (profile_id IS NULL));

-- Payments attach to a project XOR an application (TZ §4.3).
ALTER TABLE payments
  ADD CONSTRAINT payments_project_xor_application
  CHECK ((project_id IS NULL) <> (application_id IS NULL));

ALTER TABLE projects
  ADD CONSTRAINT projects_volume_amount_positive
  CHECK (volume_amount > 0);

ALTER TABLE payments
  ADD CONSTRAINT payments_amount_non_negative
  CHECK (amount >= 0);

ALTER TABLE procedures
  ADD CONSTRAINT procedures_fee_amount_non_negative
  CHECK (fee_amount IS NULL OR fee_amount >= 0);

-- UI-04 locales
ALTER TABLE users
  ADD CONSTRAINT users_locale_ui04
  CHECK (locale IN ('az', 'en', 'ru', 'tr', 'ar'));

ALTER TABLE notification_templates
  ADD CONSTRAINT notification_templates_locale_ui04
  CHECK (locale IN ('az', 'en', 'ru', 'tr', 'ar'));

ALTER TABLE guest_sessions
  ADD CONSTRAINT guest_sessions_locale_ui04
  CHECK (locale IN ('az', 'en', 'ru', 'tr', 'ar'));

-- FR-CASE-07: re-open requires a reason.
ALTER TABLE cases
  ADD CONSTRAINT cases_reopen_requires_reason
  CHECK (
    (reopened_at IS NULL AND reopen_reason IS NULL AND reopened_by IS NULL)
    OR (reopened_at IS NOT NULL AND reopen_reason IS NOT NULL)
  );

-- Cabinet / desk indexes (PLAN §5.1 item 7)
CREATE INDEX notifications_user_unread_idx
  ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX cases_desk_due_idx
  ON cases (sla_due_at)
  WHERE sla_due_at IS NOT NULL
    AND internal_status NOT IN ('COMPLETED', 'REJECTED', 'WITHDRAWN', 'ARCHIVED', 'DRAFT');

-- Application numbers: INV-YYYY-00000 (FR-APP-03). Assigned at submit, not on draft.
CREATE SEQUENCE application_public_number_seq;

CREATE OR REPLACE FUNCTION next_application_public_number()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'INV-' || to_char(timezone('UTC', now()), 'YYYY') || '-'
    || lpad(nextval('application_public_number_seq')::text, 5, '0');
$$;

-- FR-APP-04: snapshot is immutable once written.
CREATE OR REPLACE FUNCTION prevent_application_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.snapshot IS NOT NULL AND NEW.snapshot IS DISTINCT FROM OLD.snapshot THEN
    RAISE EXCEPTION 'applications.snapshot is immutable after submit (FR-APP-04)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER applications_snapshot_immutable
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION prevent_application_snapshot_mutation();

-- TZ §21.1: audit journal cannot be changed.
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_records is append-only (TZ §21.1)';
END;
$$;

CREATE TRIGGER audit_records_no_update
  BEFORE UPDATE ON audit_records
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_mutation();

CREATE TRIGGER audit_records_no_delete
  BEFORE DELETE ON audit_records
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_mutation();

-- FR-CASE-01: submitted application must have a case (checked at commit).
CREATE OR REPLACE FUNCTION ensure_case_on_submit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.submitted_at IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM cases WHERE application_id = NEW.id) THEN
    RAISE EXCEPTION 'submitted application must have a case (FR-CASE-01)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER applications_case_on_submit
  AFTER INSERT OR UPDATE OF submitted_at ON applications
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION ensure_case_on_submit();

COMMENT ON TABLE workflow_statuses IS
  'Standart workflow only (TZ §14.1). Phase 2 TZ §14.2 Ombudsman/Aftercare extra statuses are not stored.';
