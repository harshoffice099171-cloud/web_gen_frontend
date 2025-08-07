import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("=== WEBHOOK RECEIVED ===")
  console.log("Timestamp:", new Date().toISOString())
  console.log("Request URL:", request.url)
  console.log("Request method:", request.method)

  // Log request headers
  console.log("Request Headers:")
  const headers = Object.fromEntries(request.headers.entries())
  Object.entries(headers).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`)
  })

  try {
    // Get raw body first for logging
    const rawBody = await request.text()
    console.log("Raw webhook body:", rawBody)
    console.log("Raw body length:", rawBody.length)

    // Parse the JSON
    let body
    try {
      body = JSON.parse(rawBody)
    } catch (parseError) {
      console.error("Failed to parse webhook JSON:", parseError)
      console.log("Raw body that failed to parse:", rawBody)
      return NextResponse.json({ error: "Invalid JSON in webhook body" }, { status: 400 })
    }
    
    console.log("Parsed webhook body:", JSON.stringify(body, null, 2))

    // Extract job information
    const jobId = body.id
    const status = body.status
    const output = body.output
    const error = body.error

    console.log("=== WEBHOOK DATA EXTRACTION ===")
    console.log("Job ID:", jobId)
    console.log("Status:", status)
    console.log("Has Output:", !!output)
    console.log("Has Error:", !!error)

    if (output) {
      console.log("Output Details:")
      console.log("  - success:", output.success)
      console.log("  - final_video_s3_url:", output.final_video_s3_url ? "present" : "missing")
      console.log("  - final_video_presigned_url:", output.final_video_presigned_url ? "present" : "missing")
      
      if (output.final_video_s3_url) {
        console.log("  - S3 URL:", output.final_video_s3_url)
      }
      if (output.final_video_presigned_url) {
        console.log("  - Presigned URL:", output.final_video_presigned_url)
      }

      // Log processing statistics if available
      if (output.stats) {
        console.log("Processing Stats:")
        console.log("  - total_slides:", output.stats.total_slides)
        console.log("  - final_duration:", output.stats.final_duration)
        console.log("  - final_resolution:", output.stats.final_resolution)
        console.log("  - processing_time:", output.stats.processing_time)
      } else {
        console.log("No stats in output")
      }

      // Log all output keys for debugging
      console.log("All output keys:", Object.keys(output))
      console.log("Full output object:", JSON.stringify(output, null, 2))
    }

    if (error) {
      console.log("Error Details:")
      console.log("  - error:", error)
      console.log("  - error type:", typeof error)
      if (typeof error === 'object') {
        console.log("  - error keys:", Object.keys(error))
        console.log("  - full error object:", JSON.stringify(error, null, 2))
      }
    }

    // Log job completion status
    if (status === "COMPLETED") {
      console.log("🎉 JOB COMPLETED SUCCESSFULLY!")
      if (output?.final_video_presigned_url || output?.final_video_s3_url) {
        console.log("✅ Video URLs are available for download")
      } else {
        console.log("⚠️  Job completed but no video URLs found")
      }
    } else if (status === "FAILED") {
      console.log("❌ JOB FAILED!")
      console.log("Failure details:", error || body.error || "No error details provided")
    } else if (status === "IN_PROGRESS") {
      console.log("🔄 Job is in progress...")
    } else if (status === "IN_QUEUE") {
      console.log("⏳ Job is queued...")
    } else {
      console.log("❓ Unknown job status:", status)
    }

    // Log additional webhook metadata
    console.log("=== ADDITIONAL WEBHOOK METADATA ===")
    const additionalFields = Object.keys(body).filter(key => 
      !['id', 'status', 'output', 'error'].includes(key)
    )
    if (additionalFields.length > 0) {
      console.log("Additional fields in webhook:")
      additionalFields.forEach(field => {
        console.log(`  - ${field}:`, body[field])
      })
    } else {
      console.log("No additional fields in webhook")
    }

    console.log("=== WEBHOOK PROCESSED SUCCESSFULLY ===")
    console.log("Response: { success: true, message: 'Webhook received' }")
    console.log("=== END WEBHOOK PROCESSING ===\n")

    // Return success response to RunPod
    return NextResponse.json({ 
      success: true, 
      message: "Webhook received and processed successfully",
      receivedAt: new Date().toISOString(),
      jobId: jobId,
      status: status
    })

  } catch (error) {
    console.error("=== WEBHOOK ERROR ===")
    console.error("Error type:", error?.constructor?.name)
    console.error("Error message:", error instanceof Error ? error.message : String(error))
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    
    if (error instanceof SyntaxError) {
      console.error("This appears to be a JSON parsing error")
    }
    
    console.log("=== WEBHOOK ERROR END ===\n")

    return NextResponse.json({ 
      error: "Failed to process webhook",
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
