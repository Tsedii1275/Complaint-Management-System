-- ============================================================================
-- Complaint Management System (CMS) - Clean Database Export
-- ============================================================================
-- Compatible with: MySQL 8+
-- Description: Lightweight database export containing only the custom
--              CMS application tables. All Flowable internal/engine tables
--              (ACT_*, FLW_*) have been removed.
-- Tables:
--   1. users
--   2. audit_log
--   3. complaint_sla_metrics
--   4. task_time_tracking
-- Generated: 2026-05-15
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
-- USERS TABLE
-- ============================================================================

CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `enabled` bit(1) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('ROLE_ADMIN','ROLE_AUDIT_TEAM','ROLE_BRANCH_STAFF','ROLE_CMD_OFFICER','ROLE_DEPARTMENT_WORKUNIT','ROLE_SERVICE_QUALITY') NOT NULL,
  `username` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKr43af9ap4edm43mmtq01oddj6` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `created_at`, `email`, `enabled`, `password`, `role`, `username`) VALUES
(1, '2026-05-12 05:43:27.424726', 'tseday@dashenbank.com', b'1', '$2a$10$loDwKlj4nFZOco4K7Mm2MOExr89S/duHYjEhjHU4/PxKtXiulVWLm', 'ROLE_BRANCH_STAFF', 'Tseday'),
(2, '2026-05-12 05:43:27.662064', 'eyoda@dashenbank.com', b'1', '$2a$10$n8Tcd/5pwmZ17vCjFf/Qm.qAZwB2wEGM4TBFT9laCIrLdgdkl9sli', 'ROLE_CMD_OFFICER', 'Eyoda'),
(3, '2026-05-12 05:43:27.884485', 'musie@dashenbank.com', b'1', '$2a$10$UKe26u2gQjPqjnYcahkpn.h4x350jtcyK6630GcEtxzgXj2IfJyyO', 'ROLE_AUDIT_TEAM', 'Musie'),
(4, '2026-05-12 05:43:28.039664', 'selam@dashenbank.com', b'1', '$2a$10$BO1aTW2oEiAOklDyjn1nvuas1Ss9XoQLeMcQrkogsEQQKW.5aSHdW', 'ROLE_DEPARTMENT_WORKUNIT', 'Selam'),
(5, '2026-05-12 05:43:28.205982', 'lidiya@dashenbank.com', b'1', '$2a$10$1B2S3ER99FdGgxuuLXdfE.2nmpTDDt90Rs7LurFwqaQcy4GMIhuM2', 'ROLE_SERVICE_QUALITY', 'Lidiya'),
(6, '2026-05-13 06:47:53.366553', 'admin@dashenbank.com', b'1', '$2a$10$XtPAQ7yr1X0UlTt4hQSJXO8V1dm62fTzshKpV1xUJRvSiiYokrhaG', 'ROLE_ADMIN', 'admin');

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE `audit_log` (
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

--
-- Dumping data for table `audit_log`
--

INSERT INTO `audit_log` (`id`, `complaint_id`, `process_instance_id`, `task_id`, `action`, `actor`, `actor_id`, `description`, `created_at`, `complaint_category`, `complaint_description`, `customer_email`, `customer_name`) VALUES
(12, 'CM-20260508084858-557433ec', '9e8ebaf1-4aa1-11f1-b093-e073e737c012', NULL, 'COMPLAINT_CREATED', 'customer', 'web', 'New complaint submitted by ጸደይ ተካ via web channel.', '2026-05-08 05:49:04', 'branch', 'የደንበኞች አገልግሎት', 'tsediteka1@gmail.com', 'ጸደይ ተካ'),
(13, 'CM-20260508084858-557433ec', '9e8ebaf1-4aa1-11f1-b093-e073e737c012', '9e9f83e2-4aa1-11f1-b093-e073e737c012', 'TASK_COMPLETED', 'staff', 'system', 'Task \'First Contact Resolution\' completed. Comment: Its Completed with First Contact Resolution', '2026-05-08 05:55:14', 'branch', 'የደንበኞች አገልግሎት', 'tsediteka1@gmail.com', 'ጸደይ ተካ'),
(14, 'CM-20260508084858-557433ec', '9e8ebaf1-4aa1-11f1-b093-e073e737c012', NULL, 'NOTIFICATION_SENT', 'system', 'system', 'Resolution notification sent to customer.', '2026-05-08 05:55:18', NULL, NULL, NULL, NULL),
(15, 'CM-20260508084858-557433ec', '9e8ebaf1-4aa1-11f1-b093-e073e737c012', NULL, 'CASE_CLOSED', 'system', 'system', 'The complaint lifecycle has been fully completed and the case is closed.', '2026-05-08 05:55:18', 'branch', 'የደንበኞች አገልግሎት', 'tsediteka1@gmail.com', 'ጸደይ ተካ'),
(32, 'CM-20260512084949-a7eeb163', '673fe5dd-4dc6-11f1-a17b-e073e737c012', NULL, 'COMPLAINT_CREATED', 'customer', 'web', 'New complaint submitted by ጸደይ ተካ via web channel.', '2026-05-12 05:49:56', 'mobile', 'Superapp', 'tsediteka1@gmail.com', 'ጸደይ ተካ'),
(33, 'CM-20260512095811-8784cb66', 'f3127ce5-4dcf-11f1-8f61-e073e737c012', NULL, 'COMPLAINT_CREATED', 'customer', 'web', 'New complaint submitted by Tseday Teka Betela via web channel.', '2026-05-12 06:58:16', 'technical', 'cvvnbvn', 'tsediteka1@gmail.com', 'Tseday Teka Betela'),
(34, 'CM-20260512100856-5c465c9a', '732739c9-4dd1-11f1-8f61-e073e737c012', NULL, 'COMPLAINT_CREATED', 'customer', 'web', 'New complaint submitted by Test User via web channel.', '2026-05-12 07:09:00', 'general', 'Automated test complaint', 'test@example.com', 'Test User'),
(35, 'CM-20260512101132-cad3491c', 'd000259d-4dd1-11f1-8f61-e073e737c012', NULL, 'COMPLAINT_CREATED', 'customer', 'web', 'New complaint submitted by Tseday Teka Betela via web channel.', '2026-05-12 07:11:36', 'branch', 'Customer Service', 'tsediteka1@gmail.com', 'Tseday Teka Betela'),
(36, 'CM-20260512101132-cad3491c', 'd000259d-4dd1-11f1-8f61-e073e737c012', 'd00073ce-4dd1-11f1-8f61-e073e737c012', 'TASK_COMPLETED', 'staff', 'Tseday', 'Task \'First Contact Resolution\' completed.', '2026-05-12 07:11:36', 'branch', 'Customer Service', 'tsediteka1@gmail.com', 'Tseday Teka Betela'),
(37, 'CM-20260513162435-e2124bbe', '1b2b3889-4ecf-11f1-8eab-e073e737c012', NULL, 'COMPLAINT_CREATED', 'customer', 'web', 'New complaint submitted by Musie Mersehazen via web channel.', '2026-05-13 13:24:48', 'account', 'bnnn', 'tsediteka1@gmail.com', 'Musie Mersehazen');

-- ============================================================================
-- SLA METRICS TABLE
-- ============================================================================

CREATE TABLE `complaint_sla_metrics` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `audit_duration` int DEFAULT NULL,
  `branch_staff_duration` int DEFAULT NULL,
  `breached` bit(1) DEFAULT NULL,
  `cmd_duration` int DEFAULT NULL,
  `complaint_category` varchar(100) DEFAULT NULL,
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
  UNIQUE KEY `UK3nhd1g0rkg23105ls54jus5bp` (`process_instance_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `complaint_sla_metrics`
--

INSERT INTO `complaint_sla_metrics` (`id`, `audit_duration`, `branch_staff_duration`, `breached`, `cmd_duration`, `complaint_category`, `complaint_id`, `created_at`, `deadline`, `department_duration`, `process_instance_id`, `remaining_minutes`, `resolved_at`, `service_quality_duration`, `sla_status`, `total_allowed_minutes`, `total_elapsed_minutes`) VALUES
(1, 0, 0, b'0', 0, 'account', 'CM-20260513162435-e2124bbe', '2026-05-13 13:24:46.717264', '2026-05-13 21:24:46.548515', 0, '1b2b3889-4ecf-11f1-8eab-e073e737c012', 480, NULL, 0, 'ON_TIME', 480, 0);

-- ============================================================================
-- TASK TIME TRACKING TABLE
-- ============================================================================

CREATE TABLE `task_time_tracking` (
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `task_time_tracking`
--

INSERT INTO `task_time_tracking` (`id`, `assigned_user`, `complaint_id`, `completed_at`, `duration_hours`, `duration_minutes`, `lane_name`, `process_instance_id`, `started_at`, `task_definition_key`, `task_id`, `task_name`) VALUES
(1, 'initiator', 'CM-20260513162435-e2124bbe', NULL, NULL, NULL, 'BRANCH_STAFF', '1b2b3889-4ecf-11f1-8eab-e073e737c012', '2026-05-13 13:24:47.381054', 'FormTask_24', '1b6f1f6a-4ecf-11f1-8eab-e073e737c012', 'First Contact Resolution');

-- ============================================================================
-- END OF CLEAN CMS DATABASE EXPORT
-- ============================================================================

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
