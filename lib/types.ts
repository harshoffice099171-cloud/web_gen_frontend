import { type WebinarRequest } from "./supabase";

export interface Job {
  id: string;
  status: string;
  output?: {
    final_video_s3_url?: string;
    final_video_presigned_url?: string;
    success?: boolean;
    stats?: {
      final_duration?: string;
      final_resolution?: string;
      total_slides?: number;
    };
  };
  createdAt: string;
  outputName?: string;
  error?: string;
  source: "localStorage" | "supabase";
  supabaseData?: WebinarRequest;
}

export interface SupabaseJob extends Job {
  user_id?: string;
  input?: any;
  webhook_called?: boolean;
  webhook_status?: string;
  webhook_timestamp?: string;
}

export interface LocalJob extends Job {
  lastChecked?: string;
} 