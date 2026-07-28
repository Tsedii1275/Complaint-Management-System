-- ============================================================================
-- Complaint Management System (CMS) - Complete Database Schema Export
-- ============================================================================
-- Compatible with: MySQL 8+
-- Description: Complete SQL schema definitions matching the CMS data architecture.
--              Includes security tables, core complaint processing tables, SLA configurations,
--              attachments, notifications, and auditing structures.
-- Generated: 2026-07-11
-- ============================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `cms_db`
--
CREATE DATABASE IF NOT EXISTS `cms_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `cms_db`;

-- ============================================================================
-- 1. SECURITY & USER MANAGEMENT TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS `roles` (
  `role_id` bigint NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  `permissions` text DEFAULT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `UK_role_name` (`role_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `departments` (
  `department_id` bigint NOT NULL AUTO_INCREMENT,
  `department_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `enabled` bit(1) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('ROLE_ADMIN','ROLE_AUDIT_TEAM','ROLE_BRANCH_STAFF','ROLE_CMD_OFFICER','ROLE_DEPARTMENT_WORKUNIT','ROLE_SERVICE_QUALITY','ROLE_CHIEF_COMMITTEE') NOT NULL,
  `username` varchar(255) NOT NULL,
  `department_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_username` (`username`),
  KEY `FK_users_department` (`department_id`),
  CONSTRAINT `FK_users_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 2. CUSTOMER & ACCOUNT COMPLIANCE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS `customers` (
  `customer_id` bigint NOT NULL AUTO_INCREMENT,
  `cif_number` varchar(20) NOT NULL,
  `account_number` varchar(30) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `customer_type` varchar(50) NOT NULL DEFAULT 'RETAIL',
  `customer_segment` varchar(50) DEFAULT NULL,
  `is_vip` bit(1) NOT NULL DEFAULT b'0',
  `risk_rating` varchar(20) DEFAULT 'LOW',
  `customer_since` date DEFAULT NULL,
  `relationship_manager` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `UK_cif_number` (`cif_number`),
  UNIQUE KEY `UK_account_number` (`account_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 3. COMPLAINT & WORKFLOW PATHWAY TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS `complaint_categories` (
  `category_id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `UK_category_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `complaint_priorities` (
  `priority_id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(10) NOT NULL,
  `name` varchar(50) NOT NULL,
  `allowed_duration_hours` int NOT NULL,
  PRIMARY KEY (`priority_id`),
  UNIQUE KEY `UK_priority_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `complaints` (
  `complaint_id` bigint NOT NULL AUTO_INCREMENT,
  `ticket_number` varchar(50) NOT NULL,
  `customer_id` bigint NOT NULL,
  `account_number` varchar(30) DEFAULT NULL,
  `account_status` varchar(20) DEFAULT NULL,
  `home_branch` varchar(100) DEFAULT NULL,
  `channel` varchar(30) NOT NULL DEFAULT 'web',
  `description` text NOT NULL,
  `category_id` bigint DEFAULT NULL,
  `priority_id` bigint DEFAULT NULL,
  `process_instance_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`complaint_id`),
  UNIQUE KEY `UK_ticket_number` (`ticket_number`),
  KEY `FK_complaints_customer` (`customer_id`),
  KEY `FK_complaints_category` (`category_id`),
  KEY `FK_complaints_priority` (`priority_id`),
  CONSTRAINT `FK_complaints_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON DELETE CASCADE,
  CONSTRAINT `FK_complaints_category` FOREIGN KEY (`category_id`) REFERENCES `complaint_categories` (`category_id`) ON DELETE SET NULL,
  CONSTRAINT `FK_complaints_priority` FOREIGN KEY (`priority_id`) REFERENCES `complaint_priorities` (`priority_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 4. CASE LEVEL METRICS & TIMING TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS `sla_configurations` (
  `sla_config_id` bigint NOT NULL AUTO_INCREMENT,
  `category_id` bigint NOT NULL,
  `priority_id` bigint NOT NULL,
  `total_sla_duration_minutes` int NOT NULL,
  `escalation_threshold_percent` int NOT NULL DEFAULT '80',
  PRIMARY KEY (`sla_config_id`),
  KEY `FK_sla_config_category` (`category_id`),
  KEY `FK_sla_config_priority` (`priority_id`),
  CONSTRAINT `FK_sla_config_category` FOREIGN KEY (`category_id`) REFERENCES `complaint_categories` (`category_id`) ON DELETE CASCADE,
  CONSTRAINT `FK_sla_config_priority` FOREIGN KEY (`priority_id`) REFERENCES `complaint_priorities` (`priority_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `complaint_sla_metrics` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `audit_duration` int DEFAULT NULL,
  `branch_staff_duration` int DEFAULT NULL,
  `breached` bit(1) DEFAULT NULL,
  `cmd_duration` int DEFAULT NULL,
  `complaint_category` varchar(100) DEFAULT NULL,
  `branch` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `channel` varchar(50) DEFAULT NULL,
  `fcr_status` bit(1) DEFAULT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `status` varchar(30) DEFAULT NULL,
  `complaint_id` varchar(100) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `deadline` datetime(6) DEFAULT NULL,
  `department_duration` int DEFAULT NULL,
  `process_instance_id` varchar(100) DEFAULT NULL,
  `remaining_minutes` int DEFAULT NULL,
  `resolved_at` datetime(6) DEFAULT NULL,
  `service_quality_duration` int DEFAULT NULL,
  `sla_status` varchar(30) DEFAULT NULL,
  `total_allowed_minutes` int DEFAULT NULL,
  `total_elapsed_minutes` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_sla_proc_inst` (`process_instance_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `task_time_tracking` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `assigned_user` varchar(100) DEFAULT NULL,
  `complaint_id` varchar(100) DEFAULT NULL,
  `completed_at` datetime(6) DEFAULT NULL,
  `duration_hours` double DEFAULT NULL,
  `duration_minutes` bigint DEFAULT NULL,
  `lane_name` varchar(50) DEFAULT NULL,
  `process_instance_id` varchar(100) DEFAULT NULL,
  `started_at` datetime(6) DEFAULT NULL,
  `task_definition_key` varchar(100) DEFAULT NULL,
  `task_id` varchar(100) DEFAULT NULL,
  `task_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 5. WORKFLOW TRIAGE STAGE TRANSACTION TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS `cmd_screenings` (
  `screening_id` bigint NOT NULL AUTO_INCREMENT,
  `complaint_id` bigint NOT NULL,
  `screener_id` bigint NOT NULL,
  `priority_assigned_id` bigint NOT NULL,
  `requires_investigation` bit(1) NOT NULL DEFAULT b'0',
  `screening_notes` text DEFAULT NULL,
  `screened_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`screening_id`),
  KEY `FK_screening_complaint` (`complaint_id`),
  KEY `FK_screening_priority` (`priority_assigned_id`),
  CONSTRAINT `FK_screening_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE,
  CONSTRAINT `FK_screening_priority` FOREIGN KEY (`priority_assigned_id`) REFERENCES `complaint_priorities` (`priority_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `investigations` (
  `investigation_id` bigint NOT NULL AUTO_INCREMENT,
  `complaint_id` bigint NOT NULL,
  `investigator_id` bigint NOT NULL,
  `findings` text NOT NULL,
  `justification` text NOT NULL,
  `investigated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`investigation_id`),
  KEY `FK_invest_complaint` (`complaint_id`),
  CONSTRAINT `FK_invest_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `committee_reviews` (
  `review_id` bigint NOT NULL AUTO_INCREMENT,
  `complaint_id` bigint NOT NULL,
  `reviewer_id` bigint NOT NULL,
  `decision` varchar(30) NOT NULL,
  `explanation` text NOT NULL,
  `reviewed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`),
  KEY `FK_review_complaint` (`complaint_id`),
  CONSTRAINT `FK_review_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `resolutions` (
  `resolution_id` bigint NOT NULL AUTO_INCREMENT,
  `complaint_id` bigint NOT NULL,
  `resolver_id` bigint NOT NULL,
  `resolution_notes` text NOT NULL,
  `resolved_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`resolution_id`),
  KEY `FK_resolution_complaint` (`complaint_id`),
  CONSTRAINT `FK_resolution_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `customer_feedbacks`;

CREATE TABLE IF NOT EXISTS `customer_feedback` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ticket_id` varchar(100) NOT NULL,
  `process_instance_id` varchar(100) DEFAULT NULL,
  `satisfied` bit(1) NOT NULL,
  `comment` text DEFAULT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 6. SUPPORTING MEDIA, NOTIFICATIONS & AUDITING
-- ============================================================================

CREATE TABLE IF NOT EXISTS `attachments` (
  `attachment_id` bigint NOT NULL AUTO_INCREMENT,
  `complaint_id` bigint NOT NULL,
  `uploader_id` bigint DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_url` varchar(500) NOT NULL,
  `file_type` varchar(100) NOT NULL,
  `file_size_bytes` bigint NOT NULL,
  `context_type` varchar(50) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attachment_id`),
  KEY `FK_attachment_complaint` (`complaint_id`),
  CONSTRAINT `FK_attachment_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `notification_id` bigint NOT NULL AUTO_INCREMENT,
  `complaint_id` bigint NOT NULL,
  `recipient_contact` varchar(255) NOT NULL,
  `type` varchar(10) NOT NULL,
  `content` text NOT NULL,
  `sent_status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `sent_at` timestamp NULL DEFAULT NULL,
  `failure_reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`notification_id`),
  KEY `FK_notif_complaint` (`complaint_id`),
  CONSTRAINT `FK_notif_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `complaint_id` varchar(100) DEFAULT NULL,
  `process_instance_id` varchar(100) DEFAULT NULL,
  `task_id` varchar(100) DEFAULT NULL,
  `action` varchar(100) DEFAULT NULL,
  `actor` varchar(100) DEFAULT NULL,
  `actor_id` varchar(100) DEFAULT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `complaint_category` varchar(100) DEFAULT NULL,
  `complaint_description` text,
  `customer_email` varchar(150) DEFAULT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- SEED INITIAL DATA
-- ============================================================================

-- Seed standard user records if not exists
INSERT INTO `users` (`id`, `created_at`, `email`, `enabled`, `password`, `role`, `username`) VALUES
(1, '2026-05-12 05:43:27.424726', 'tseday@dashenbank.com', b'1', '$2a$10$loDwKlj4nFZOco4K7Mm2MOExr89S/duHYjEhjHU4/PxKtXiulVWLm', 'ROLE_BRANCH_STAFF', 'Tseday'),
(2, '2026-05-12 05:43:27.662064', 'eyoda@dashenbank.com', b'1', '$2a$10$n8Tcd/5pwmZ17vCjFf/Qm.qAZwB2wEGM4TBFT9laCIrLdgdkl9sli', 'ROLE_CMD_OFFICER', 'Eyoda'),
(3, '2026-05-12 05:43:27.884485', 'musie@dashenbank.com', b'1', '$2a$10$UKe26u2gQjPqjnYcahkpn.h4x350jtcyK6630GcEtxzgXj2IfJyyO', 'ROLE_AUDIT_TEAM', 'Musie'),
(4, '2026-05-12 05:43:28.039664', 'selam@dashenbank.com', b'1', '$2a$10$BO1aTW2oEiAOklDyjn1nvuas1Ss9XoQLeMcQrkogsEQQKW.5aSHdW', 'ROLE_DEPARTMENT_WORKUNIT', 'Selam'),
(5, '2026-05-12 05:43:28.205982', 'lidiya@dashenbank.com', b'1', '$2a$10$1B2S3ER99FdGgxuuLXdfE.2nmpTDDt90Rs7LurFwqaQcy4GMIhuM2', 'ROLE_SERVICE_QUALITY', 'Lidiya'),
(6, '2026-05-13 06:47:53.366553', 'admin@dashenbank.com', b'1', '$2a$10$XtPAQ7yr1X0UlTt4hQSJXO8V1dm62fTzshKpV1xUJRvSiiYokrhaG', 'ROLE_ADMIN', 'admin')
ON DUPLICATE KEY UPDATE `username`=`username`;

-- ============================================================================
-- 7. ROOT CAUSE ANALYSIS (RCA) MODULE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS `rca_cases` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ticket_id` varchar(50) NOT NULL,
  `process_instance_id` varchar(100) DEFAULT NULL,
  `root_cause_category` varchar(100) DEFAULT NULL,
  `incident_date` timestamp NULL DEFAULT NULL,
  `rca_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `analysis_date` timestamp NULL DEFAULT NULL,
  `financial_impact` decimal(15,2) DEFAULT '0.00',
  `reputational_risk` varchar(30) DEFAULT 'LOW',
  `compliance_impact` varchar(100) DEFAULT NULL,
  `operational_disruption` varchar(255) DEFAULT NULL,
  `risk_score` double DEFAULT '0.0',
  `preventive_strategy` text DEFAULT NULL,
  `rca_required` bit(1) DEFAULT NULL,
  `rca_summary` text DEFAULT NULL,
  `rca_owner` varchar(100) DEFAULT NULL,
  `rca_completion_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_rca_ticket` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `rca_5whys` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `rca_case_id` bigint NOT NULL,
  `why_1` varchar(255) DEFAULT NULL,
  `why_2` varchar(255) DEFAULT NULL,
  `why_3` varchar(255) DEFAULT NULL,
  `why_4` varchar(255) DEFAULT NULL,
  `why_5` varchar(255) DEFAULT NULL,
  `root_cause_statement` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_whys_rca` (`rca_case_id`),
  CONSTRAINT `FK_whys_rca` FOREIGN KEY (`rca_case_id`) REFERENCES `rca_cases` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `corrective_preventive_actions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `rca_case_id` bigint NOT NULL,
  `action_type` varchar(20) NOT NULL,
  `action_description` text NOT NULL,
  `owner` varchar(100) NOT NULL,
  `target_date` date DEFAULT NULL,
  `implementation_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `effectiveness_rating` varchar(20) DEFAULT NULL,
  `verification_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `FK_capa_rca` (`rca_case_id`),
  CONSTRAINT `FK_capa_rca` FOREIGN KEY (`rca_case_id`) REFERENCES `rca_cases` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `rca_audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `rca_case_id` bigint DEFAULT NULL,
  `ticket_id` varchar(50) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `actor` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 8. CUSTOMER FEEDBACK & SATISFACTION MEASUREMENT TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS `customer_feedback` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `complaint_id` varchar(100) DEFAULT NULL,
  `ticket_number` varchar(100) NOT NULL,
  `resolution_confirmed` bit(1) DEFAULT NULL,
  `csat_score` int DEFAULT NULL,
  `nps_score` int DEFAULT NULL,
  `nps_comment` text,
  `ces_score` int DEFAULT NULL,
  `ces_comment` text,
  `additional_comments` text,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `reopened_case` bit(1) DEFAULT b'0',
  `secure_token` varchar(100) DEFAULT NULL,
  `token_expired` bit(1) DEFAULT b'0',
  `feedback_request_sent_at` timestamp NULL DEFAULT NULL,
  `feedback_submitted_at` timestamp NULL DEFAULT NULL,
  `feedback_response_time` bigint DEFAULT NULL,
  `reopen_count` int DEFAULT '0',
  `customer_satisfaction_status` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_feedback_token` (`secure_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE customer_feedback MODIFY COLUMN satisfied bit(1) DEFAULT NULL;
ALTER TABLE customer_feedback MODIFY COLUMN comment text DEFAULT NULL;
ALTER TABLE customer_feedback MODIFY COLUMN ticket_id varchar(100) DEFAULT NULL;
ALTER TABLE customer_feedback ADD COLUMN preferred_language varchar(30) DEFAULT 'english';
ALTER TABLE complaint_sla_metrics ADD COLUMN department varchar(100) DEFAULT NULL;
ALTER TABLE complaint_sla_metrics ADD COLUMN manager varchar(100) DEFAULT NULL;
ALTER TABLE complaint_sla_metrics ADD COLUMN assigned_user_id bigint DEFAULT NULL;
ALTER TABLE users ADD COLUMN district varchar(100) DEFAULT NULL;
ALTER TABLE users ADD COLUMN branch varchar(100) DEFAULT NULL;
ALTER TABLE users ADD COLUMN department varchar(100) DEFAULT NULL;
ALTER TABLE users ADD COLUMN full_name varchar(255) DEFAULT NULL;

COMMIT;
