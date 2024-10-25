CREATE TABLE models3d (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(4096) NOT NULL,
    name VARCHAR(4096) NOT NULL UNIQUE, -- unique slug
    license VARCHAR(256),
    author VARCHAR(256),
    path VARCHAR(4096) NOT NULL UNIQUE,
    origin VARCHAR(2048),
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE files3d (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    model_id INTEGER NOT NULL, -- Foreign key to models table
    path VARCHAR(4096) NOT NULL UNIQUE,
    preview_image VARCHAR(4096) UNIQUE,
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_hash CHAR(135), -- sha256 including prefix
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE -- Delete all if model is removed
);
