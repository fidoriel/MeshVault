-- Add favourite column to models3d table
ALTER TABLE models3d ADD COLUMN favourite BOOLEAN NOT NULL DEFAULT 0;
