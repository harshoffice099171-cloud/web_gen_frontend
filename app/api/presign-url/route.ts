import { type NextRequest, NextResponse } from "next/server"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { s3_url } = await request.json()

    if (!s3_url) {
      return NextResponse.json({ error: "S3 URL is required" }, { status: 400 })
    }

    let bucket: string
    let key: string

    // Support both formats:
    // 1. S3 URI format: s3://bucket-name/path/to/file.mp4
    // 2. HTTPS format: https://bucket-name.s3.amazonaws.com/path/to/file.mp4
    if (s3_url.startsWith("s3://")) {
      // Handle S3 URI format: s3://bucket-name/path/to/file.mp4
      const s3Uri = s3_url.substring(5) // Remove 's3://' prefix
      const firstSlashIndex = s3Uri.indexOf("/")

      if (firstSlashIndex === -1) {
        return NextResponse.json({ error: "Invalid S3 URI format - missing key" }, { status: 400 })
      }

      bucket = s3Uri.substring(0, firstSlashIndex)
      key = s3Uri.substring(firstSlashIndex + 1)
    } else {
      // Handle HTTPS format
      const url = new URL(s3_url)

      if (url.hostname.includes("s3.amazonaws.com")) {
        // Format: https://s3.amazonaws.com/bucket-name/key
        const pathParts = url.pathname.split("/").filter(Boolean)
        bucket = pathParts[0]
        key = pathParts.slice(1).join("/")
      } else if (url.hostname.endsWith(".s3.amazonaws.com")) {
        // Format: https://bucket-name.s3.amazonaws.com/key
        bucket = url.hostname.split(".")[0]
        key = url.pathname.substring(1) // Remove leading slash
      } else {
        return NextResponse.json({ error: "Invalid S3 URL format" }, { status: 400 })
      }
    }

    // Validate bucket and key
    if (!bucket || !key) {
      return NextResponse.json({ error: "Could not extract bucket and key from S3 URL" }, { status: 400 })
    }

    // Configure S3 client with credentials from environment variables
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })

    // Create the GetObject command
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    // Generate presigned URL (expires in 1 hour)
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return NextResponse.json({ presignedUrl })
  } catch (error) {
    console.error("=== PRESIGN URL API ERROR ===")
    console.error("Error:", error)

    return NextResponse.json({ error: "Failed to generate presigned URL" }, { status: 500 })
  }
}
