import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch("https://api.runpod.ai/v2/2avss4yt186a6m/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    const result = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to create job", details: result }, { status: response.status })
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
