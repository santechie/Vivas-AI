-- =====================================================================
-- VIVAS AI — AGRI INPUT PARTNER HUB (INPUT PARTNER HUB)
-- Phase 1 Rollback Script: Drops ONLY the 33 pih_ tables and helper function
-- Leaves all existing vivas_* and ch_* tables 100% untouched.
-- =====================================================================

-- 5. Platform, Consent, Jobs and Audit (8 tables)
DROP TABLE IF EXISTS pih_audit_log CASCADE;
DROP TABLE IF EXISTS pih_notifications CASCADE;
DROP TABLE IF EXISTS pih_jobs CASCADE;
DROP TABLE IF EXISTS pih_sync_state CASCADE;
DROP TABLE IF EXISTS pih_data_sharing_consents CASCADE;
DROP TABLE IF EXISTS pih_webhook_deliveries CASCADE;
DROP TABLE IF EXISTS pih_webhooks CASCADE;
DROP TABLE IF EXISTS pih_api_keys CASCADE;

-- 4. Commerce (6 tables)
DROP TABLE IF EXISTS pih_settlements CASCADE;
DROP TABLE IF EXISTS pih_order_status_history CASCADE;
DROP TABLE IF EXISTS pih_store_order_items CASCADE;
DROP TABLE IF EXISTS pih_store_orders CASCADE;
DROP TABLE IF EXISTS pih_cart_items CASCADE;
DROP TABLE IF EXISTS pih_carts CASCADE;

-- 3. Field Evidence and AI (7 tables)
DROP TABLE IF EXISTS pih_reviews CASCADE;
DROP TABLE IF EXISTS pih_recommendations CASCADE;
DROP TABLE IF EXISTS pih_product_ratings CASCADE;
DROP TABLE IF EXISTS pih_ai_inferences CASCADE;
DROP TABLE IF EXISTS pih_trial_observations CASCADE;
DROP TABLE IF EXISTS pih_field_trials CASCADE;
DROP TABLE IF EXISTS pih_treatment_outcomes CASCADE;

-- 2. Catalogue and Bulk Import (8 tables)
DROP TABLE IF EXISTS pih_import_errors CASCADE;
DROP TABLE IF EXISTS pih_import_batches CASCADE;
DROP TABLE IF EXISTS pih_product_media CASCADE;
DROP TABLE IF EXISTS pih_product_claims CASCADE;
DROP TABLE IF EXISTS pih_product_crop_suitability CASCADE;
DROP TABLE IF EXISTS pih_product_composition CASCADE;
DROP TABLE IF EXISTS pih_product_skus CASCADE;
DROP TABLE IF EXISTS pih_products CASCADE;

-- 1. Partners and Stores (4 tables)
DROP TABLE IF EXISTS pih_stores CASCADE;
DROP TABLE IF EXISTS pih_partner_documents CASCADE;
DROP TABLE IF EXISTS pih_partner_users CASCADE;
DROP TABLE IF EXISTS pih_partners CASCADE;

-- Drop helper trigger function
DROP FUNCTION IF EXISTS pih_touch_updated_at();
