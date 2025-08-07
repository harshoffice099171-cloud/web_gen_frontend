import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("=== GENERATE API CALLED ===")
  console.log("Timestamp:", new Date().toISOString())

  try {
    const body = await request.json()

    // Log the payload structure
    console.log("Payload structure:", {
      hasInput: !!body.input,
      hasWebhook: !!body.webhook,
      webhookUrl: body.webhook,
      inputKeys: body.input ? Object.keys(body.input) : [],
      presentation_file: body.input?.presentation_file ? `[${body.input.presentation_file.length} chars]` : "missing",
      input_video: body.input?.input_video ? `[${body.input.input_video.length} chars]` : "missing",
      voice_id: body.input?.voice_id,
      output_name: body.input?.output_name || "not provided",
      lipsync_type: body.input?.lipsync_type,
      video_scale: body.input?.video_scale || "not provided",
      video_position: body.input?.video_position || "not provided",
      presentation_file_type: body.input?.presentation_file_type,
      input_video_type: body.input?.input_video_type,
    })

    console.log("Calling RunPod API with webhook...")

    const response = await fetch("https://api.runpod.ai/v2/2avss4yt186a6m/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    console.log("RunPod Response Status:", response.status)

    const result = await response.json()
    console.log("RunPod Response:", result)

    if (!response.ok) {
      console.error("RunPod API Error:", result)
      return NextResponse.json({ error: "Failed to create job", details: result }, { status: response.status })
    }

    console.log("Job created successfully with webhook:", result.id)
    console.log("=== GENERATE API COMPLETED ===\n")

    return NextResponse.json(result)
  } catch (error) {
    console.error("=== GENERATE API ERROR ===")
    console.error("Error:", error)
    console.log("=== GENERATE API ERROR END ===\n")

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
