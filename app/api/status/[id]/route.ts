import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Validate job ID format
    if (!id || id.trim() === "") {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 })
    }

    const response = await fetch(`https://api.runpod.ai/v2/2avss4yt186a6m/status/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`,
        "Content-Type": "application/json",
      },
    })

    const result = await response.json()

    // Handle different response scenarios
    if (response.status === 404 || (result.error && result.error.includes("does not exist"))) {
      return NextResponse.json(
        {
          id: id,
          status: "NOT_FOUND",
          error: "Job not found in RunPod system",
          message: "This job may have expired or was never created successfully",
        },
        { status: 404 },
      )
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Failed to get job status",
          details: result,
          runpodError: result.error || "Unknown error",
        },
        { status: response.status },
      )
    }

    // Extract the important information from the response
    const statusResponse = {
      id: result.id,
      status: result.status,
      output: result.output || null,
      delayTime: result.delayTime,
      executionTime: result.executionTime,
      workerId: result.workerId,
    }

    return NextResponse.json(statusResponse)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
