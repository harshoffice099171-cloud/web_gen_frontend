-- Create the webinar_requests table
CREATE TABLE IF NOT EXISTS webinar_requests (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    run_id TEXT,
    
    -- Request fields  
    voice_audio_type TEXT,  -- Changed from voice_id to store audio file type (mp3, wav, etc.)
    voice_audio_size_bytes INTEGER,  -- Added to track audio file size
    output_name TEXT,
    lipsync_type TEXT,
    video_scale DECIMAL,
    video_position TEXT,
    presentation_file_type TEXT,
    input_video_type TEXT,
    presentation_file_size_bytes INTEGER,
    input_video_size_bytes INTEGER,
    
    -- Response fields
    success BOOLEAN NOT NULL DEFAULT FALSE,
    final_video_s3_url TEXT,
    final_video_presigned_url TEXT,
    input_video_s3_url TEXT,
    presentation_s3_url TEXT,
    
    -- Processing info
    processing_time_seconds DECIMAL,
    error_message TEXT,
    
    -- Statistics
    total_slides INTEGER,
    extracted_slides INTEGER,
    successful_audio INTEGER,
    successful_videos INTEGER,
    successful_combinations INTEGER,
    final_duration_seconds DECIMAL,
    final_resolution TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on run_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_webinar_requests_run_id ON webinar_requests(run_id);

-- Create an index on timestamp for chronological ordering
CREATE INDEX IF NOT EXISTS idx_webinar_requests_timestamp ON webinar_requests(timestamp DESC);
