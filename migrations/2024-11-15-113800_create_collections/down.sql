-- Drop indexes
DROP INDEX IF EXISTS idx_model_collections_collection_id;
DROP INDEX IF EXISTS idx_model_collections_model_id;

-- Drop tables
DROP TABLE IF EXISTS model_collections;
DROP TABLE IF EXISTS collections;
