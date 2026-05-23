-- Add user-defined label to batches (nullable; fallback display is "N accounts")
alter table radar_batches
  add column if not exists label text;
