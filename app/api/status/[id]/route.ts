import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  console.log("=== STATUS API CALLED ===")
  console.log("Timestamp:", new Date().toISOString())

  try {
    const { id } = params
    console.log("Job ID:", id)

    // Validate job ID format
    if (!id || id.trim() === "") {
      console.error("Invalid job ID: empty or null")
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 })
    }

    console.log("Calling RunPod Status API...")
    console.log("RunPod Status Endpoint:", `https://api.runpod.ai/v2/2avss4yt186a6m/status/${id}`)
    console.log("API Key Present:", !!process.env.RUNPOD_API_KEY)

    const response = await fetch(`https://api.runpod.ai/v2/2avss4yt186a6m/status/${id}?t=${Date.now()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
      cache: "no-store",
    })

    console.log("RunPod Status Response Status:", response.status)
    console.log("RunPod Status Response Headers:", Object.fromEntries(response.headers.entries()))

    const result = await response.json()
    console.log("RunPod Status Response Body:", JSON.stringify(result, null, 2))

    // Handle different response scenarios
    if (response.status === 404 || (result.error && result.error.includes("does not exist"))) {
      console.log("Job not found in RunPod system")
      const notFoundResponse = NextResponse.json(
        {
          id: id,
          status: "NOT_FOUND",
          error: "Job not found in RunPod system",
          message: "This job may have expired or was never created successfully",
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      )

      notFoundResponse.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
      notFoundResponse.headers.set("Pragma", "no-cache")
      notFoundResponse.headers.set("Expires", "0")

      return notFoundResponse
    }

    if (!response.ok) {
      console.error("RunPod Status API Error:", {
        status: response.status,
        statusText: response.statusText,
        body: result,
      })
      const errorResponse = NextResponse.json(
        {
          error: "Failed to get job status",
          details: result,
          runpodError: result.error || "Unknown error",
          timestamp: new Date().toISOString(),
        },
        { status: response.status },
      )

      errorResponse.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
      errorResponse.headers.set("Pragma", "no-cache")
      errorResponse.headers.set("Expires", "0")

      return errorResponse
    }

    // Extract the important information from the response
    const statusResponse = {
      id: result.id,
      status: result.status,
      output: result.output || null,
      delayTime: result.delayTime,
      executionTime: result.executionTime,
      workerId: result.workerId,
      timestamp: new Date().toISOString(),
      error: result.error || null,
    }

    console.log("Processed status response:", {
      id: statusResponse.id,
      status: statusResponse.status,
      hasOutput: !!statusResponse.output,
      hasFinalVideo: !!statusResponse.output?.final_video_s3_url,
      finalVideoUrl: statusResponse.output?.final_video_s3_url || "not available",
      hasError: !!statusResponse.error,
      error: statusResponse.error,
    })

    console.log("=== STATUS API COMPLETED ===\n")

    const successResponse = NextResponse.json(statusResponse)

    successResponse.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    successResponse.headers.set("Pragma", "no-cache")
    successResponse.headers.set("Expires", "0")
    successResponse.headers.set("Last-Modified", new Date().toUTCString())

    return successResponse
  } catch (error) {
    console.error("=== STATUS API ERROR ===")
    console.error("Error:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    console.log("=== STATUS API ERROR END ===\n")

    const errorResponse = NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )

    errorResponse.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    errorResponse.headers.set("Pragma", "no-cache")
    errorResponse.headers.set("Expires", "0")

    return errorResponse
  }
}
