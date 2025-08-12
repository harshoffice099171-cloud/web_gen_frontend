import { createClient } from "@supabase/supabase-js"

// Updated to use NEXT_PUBLIC_ prefixed environment variables for client-side access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface WebinarRequest {
  id: number
  timestamp: string
  run_id: string | null
  voice_id: string | null
  output_name: string | null
  lipsync_type: string | null
  video_scale: number | null
  video_position: string | null
  presentation_file_type: string | null
  input_video_type: string | null
  presentation_file_size_bytes: number | null
  input_video_size_bytes: number | null
  success: boolean
  final_video_s3_url: string | null
  final_video_presigned_url: string | null
  input_video_s3_url: string | null
  presentation_s3_url: string | null
  processing_time_seconds: number | null
  error_message: string | null
  total_slides: number | null
  extracted_slides: number | null
  successful_audio: number | null
  successful_videos: number | null
  successful_combinations: number | null
  final_duration_seconds: number | null
  final_resolution: string | null
  created_at: string
}
