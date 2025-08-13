import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Get raw body first for logging
    const rawBody = await request.text()

    // Parse the JSON
    let body
    try {
      body = JSON.parse(rawBody)
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid JSON in webhook body" }, { status: 400 })
    }

    // Extract job information
    const jobId = body.id
    const status = body.status
    const output = body.output
    const error = body.error

    // Return success response to RunPod
    return NextResponse.json({
      success: true,
      message: "Webhook received and processed successfully",
      receivedAt: new Date().toISOString(),
      jobId: jobId,
      status: status,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
