-- Create collections table
CREATE TABLE collections (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(256) NOT NULL,
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create junction table for many-to-many relationship between models and collections
CREATE TABLE model_collections (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    model_id INTEGER NOT NULL,
    collection_id INTEGER NOT NULL,
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (model_id, collection_id),
    FOREIGN KEY (model_id) REFERENCES models3d(id) ON DELETE CASCADE,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_model_collections_model_id ON model_collections(model_id);
CREATE INDEX idx_model_collections_collection_id ON model_collections(collection_id);
