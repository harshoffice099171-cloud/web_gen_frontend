import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  // Validate job ID format
  if (!id || id.trim() === "") {
    return NextResponse.json({ error: "Invalid job ID" }, { status: 400 })
  }

  try {
    // Add cache-busting and no-cache headers
    const response = await fetch(`https://api.runpod.ai/v2/m1kiwmukb6m73q/status/${id}?_t=${Date.now()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    })

    const result = await response.json()
    
    // Add logging to see what RunPod actually returns
    console.log(`RunPod response for ${id}:`, JSON.stringify(result, null, 2))

    // Handle different response scenarios
    if (response.status === 404 || (result.error && result.error.includes("does not exist"))) {
      return NextResponse.json(
        {
          id: id,
          status: "NOT_FOUND",
          error: "Job not found in RunPod system",
          message: "This job may have expired or was never created successfully",
        },
        { 
          status: 404,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          }
        },
      )
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Failed to get job status",
          details: result,
          runpodError: result.error || "Unknown error",
        },
        { 
          status: response.status,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          }
        },
      )
    }

    // Extract ALL important information from the response, including error field
    const statusResponse = {
      id: result.id,
      status: result.status,
      output: result.output || null,
      delayTime: result.delayTime,
      executionTime: result.executionTime,
      workerId: result.workerId,
      // This is the key fix - include the error field!
      error: result.error || undefined,
    }

    console.log(`Returning status response for ${id}:`, statusResponse)

    return NextResponse.json(statusResponse, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache", 
        "Expires": "0",
      }
    })
  } catch (error) {
    console.error(`Error fetching status for ${id}:`, error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { 
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        }
      },
    )
  }
}
