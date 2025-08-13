"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Download, RefreshCw, Trash2, AlertCircle, AlertTriangle, Plus } from "lucide-react"
import Link from "next/link"
import { supabase, type WebinarRequest } from "@/lib/supabase"

interface Job {
  id: string
  status: string
  output?: {
    final_video_s3_url?: string
    final_video_presigned_url?: string
    success?: boolean
    stats?: {
      final_duration?: string
      final_resolution?: string
      total_slides?: number
    }
  }
  createdAt: string
  outputName?: string
  error?: string
  message?: string
  source?: "localStorage" | "supabase"
  supabaseData?: WebinarRequest
}

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pollingJobs, setPollingJobs] = useState<Set<string>>(new Set())
  const [downloadingJobs, setDownloadingJobs] = useState<Set<string>>(new Set())

  const fetchSupabaseJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("webinar_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) {
        if (error.message.includes("Could not find the table") || error.message.includes("schema cache")) {
          console.warn("Supabase table 'webinar_requests' not found. Please run the table creation script first.")
          console.warn("The app will continue to work with localStorage jobs only.")
          return []
        }
        console.error("Error fetching Supabase jobs:", error)
        return []
      }

      return data.map((record: WebinarRequest) => ({
        id: record.run_id || record.id.toString(),
        status: record.success ? "COMPLETED" : record.error_message ? "FAILED" : "UNKNOWN",
        output: {
          final_video_s3_url: record.final_video_s3_url,
          final_video_presigned_url: record.final_video_presigned_url,
          success: record.success,
          stats: {
            final_duration: record.final_duration_seconds ? `${record.final_duration_seconds}s` : undefined,
            final_resolution: record.final_resolution,
            total_slides: record.total_slides,
          },
        },
        createdAt: record.created_at,
        outputName: record.output_name,
        error: record.error_message,
        source: "supabase" as const,
        supabaseData: record,
      }))
    } catch (error) {
      console.warn("Supabase connection error. App will continue with localStorage jobs only.")
      console.error("Supabase error details:", error)
      return []
    }
  }

  useEffect(() => {
    const loadJobs = async () => {
      setIsLoading(true)

      // Load current jobs from localStorage
      const localStorageJobs: Job[] = []
      if (typeof window !== "undefined") {
        const savedJobs = localStorage.getItem("webinar-jobs")
        if (savedJobs) {
          try {
            const parsedJobs = JSON.parse(savedJobs)
            localStorageJobs.push(...parsedJobs.map((job: any) => ({ ...job, source: "localStorage" })))
          } catch (error) {
            console.error("Error parsing saved jobs:", error)
          }
        }
      }

      const supabaseJobs = await fetchSupabaseJobs()

      // Combine and deduplicate jobs (localStorage takes precedence)
      const allJobs = [...localStorageJobs]
      const localJobIds = new Set(localStorageJobs.map((job) => job.id))

      supabaseJobs.forEach((supabaseJob) => {
        if (!localJobIds.has(supabaseJob.id)) {
          allJobs.push(supabaseJob)
        }
      })

      setJobs(allJobs)
      setIsLoading(false)

      // Start polling for localStorage jobs that are in progress
      localStorageJobs.forEach((job) => {
        if (job.status === "IN_QUEUE" || job.status === "IN_PROGRESS") {
          setTimeout(() => pollJobStatus(job.id), 1000)
        }
      })
    }

    loadJobs()
  }, [])

  useEffect(() => {
    if (!isLoading && jobs.length > 0) {
      jobs.forEach((job) => {
        if (job.source === "localStorage" && (job.status === "IN_QUEUE" || job.status === "IN_PROGRESS")) {
          console.log(`Auto-starting polling for job ${job.id} with status ${job.status}`)
          setTimeout(() => {
            pollJobStatus(job.id)
          }, Math.random() * 2000)
        }
      })
    }
  }, [isLoading, jobs.length])

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const localStorageJobs = jobs.filter((job) => job.source === "localStorage")
        localStorage.setItem("webinar-jobs", JSON.stringify(localStorageJobs))
      }
    } catch (error) {
      console.error("Error saving jobs to localStorage:", error)
    }
  }, [jobs])

  const pollJobStatus = async (jobId: string) => {
    if (pollingJobs.has(jobId)) {
      console.log(`Already polling job ${jobId}, skipping...`)
      return
    }

    setPollingJobs((prev) => new Set(prev).add(jobId))

    try {
      console.log(`Polling status for job: ${jobId}`)
      const response = await fetch(`https://api.runpod.ai/v2/2avss4yt186a6m/status/${jobId}`)

      if (response.status === 404) {
        const data = await response.json()
        setJobs((prevJobs) =>
          prevJobs.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  status: "NOT_FOUND",
                  error: data.error,
                  message: data.message,
                }
              : job,
          ),
        )
        console.log(`Job ${jobId} not found in RunPod system`)
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        console.error(`Error polling job ${jobId}:`, errorData)

        setJobs((prevJobs) =>
          prevJobs.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  status: "ERROR",
                  error: errorData.runpodError || errorData.error,
                  message: "Failed to get job status",
                }
              : job,
          ),
        )
        return
      }

      const data = await response.json()
      console.log(`Job ${jobId} status:`, data.status)
      console.log(`Job ${jobId} output:`, data.output)

      setJobs((prevJobs) =>
        prevJobs.map((job) =>
          job.id === jobId
            ? {
                ...job,
                status: data.status || job.status,
                output: data.output || job.output,
                error: undefined,
                message: undefined,
              }
            : job,
        ),
      )

      if (data.status === "IN_QUEUE" || data.status === "IN_PROGRESS") {
        console.log(`Job ${jobId} still in progress (${data.status}), continuing to poll...`)
        setTimeout(() => {
          setPollingJobs((prev) => {
            const newSet = new Set(prev)
            newSet.delete(jobId)
            return newSet
          })
          pollJobStatus(jobId)
        }, 5000)
      } else {
        console.log(`Job ${jobId} completed with status: ${data.status}`)
        setPollingJobs((prev) => {
          const newSet = new Set(prev)
          newSet.delete(jobId)
          return newSet
        })
      }
    } catch (error) {
      console.error(`Error polling job status for ${jobId}:`, error)
      setJobs((prevJobs) =>
        prevJobs.map((job) =>
          job.id === jobId
            ? {
                ...job,
                status: "ERROR",
                error: "Network error",
                message: "Failed to connect to status API",
              }
            : job,
        ),
      )
      setPollingJobs((prev) => {
        const newSet = new Set(prev)
        newSet.delete(jobId)
        return newSet
      })
    }
  }

  const handleRefreshStatus = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId)
    if (job?.source === "localStorage") {
      pollJobStatus(jobId)
    }
  }

  const handleDeleteJob = (jobId: string) => {
    setJobs((prevJobs) => prevJobs.filter((job) => job.id !== jobId))
  }

  const handleClearAllJobs = () => {
    setJobs((prevJobs) => prevJobs.filter((job) => job.source === "supabase"))
    if (typeof window !== "undefined") {
      localStorage.removeItem("webinar-jobs")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-500"
      case "failed":
        return "bg-red-500"
      case "in_progress":
        return "bg-blue-500"
      case "in_queue":
        return "bg-yellow-500"
      case "not_found":
        return "bg-orange-500"
      case "error":
        return "bg-red-600"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "not_found":
        return <AlertCircle className="h-4 w-4" />
      case "error":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return null
    }
  }

  const hasVideoUrl = (job: Job) => {
    return !!job.output?.final_video_s3_url
  }

  const generatePresignedUrl = async (s3Url: string): Promise<string> => {
    const response = await fetch("/api/presign-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ s3_url: s3Url }),
    })

    if (!response.ok) {
      throw new Error("Failed to generate presigned URL")
    }

    const data = await response.json()
    return data.presignedUrl
  }

  const handleDownload = async (jobId: string, outputName?: string) => {
    const job = jobs.find((j) => j.id === jobId)
    if (!job || !job.output?.final_video_s3_url) {
      alert("No S3 URL available for this video")
      return
    }

    setDownloadingJobs((prev) => new Set(prev).add(jobId))

    try {
      console.log("Generating presigned URL from S3 URL:", job.output.final_video_s3_url)

      const presignedUrl = await generatePresignedUrl(job.output.final_video_s3_url)

      console.log("Generated presigned URL for download:", presignedUrl)

      const link = document.createElement("a")
      link.href = presignedUrl
      link.download = outputName || `webinar-${jobId}.mp4`

      link.setAttribute("target", "_blank")
      link.setAttribute("rel", "noopener noreferrer")

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log("Download initiated successfully")
    } catch (error) {
      console.error("Error downloading file:", error)

      try {
        console.log("Falling back to direct S3 URL download")
        const link = document.createElement("a")
        link.href = job.output.final_video_s3_url
        link.download = outputName || `webinar-${jobId}.mp4`
        link.setAttribute("target", "_blank")
        link.setAttribute("rel", "noopener noreferrer")

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (fallbackError) {
        console.error("Fallback download also failed:", fallbackError)
        alert(`Error downloading file: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    } finally {
      setDownloadingJobs((prev) => {
        const newSet = new Set(prev)
        newSet.delete(jobId)
        return newSet
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg text-gray-600">Loading your webinars...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Webinar Generator</h1>
          <p className="text-xl text-gray-600 mb-8">Transform your presentations into engaging video webinars</p>
          <Link href="/create">
            <Button size="lg" className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Webinar
            </Button>
          </Link>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">Your Webinars</h2>
            {jobs.some((job) => job.source === "localStorage") && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="lg">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Current Jobs
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all current jobs?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all current jobs from your browser storage. Previous jobs from your history will
                      remain. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAllJobs}>Clear Jobs</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Loading your webinars...</p>
            </div>
          ) : jobs.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <p className="text-gray-600 mb-4">No webinars found. Create your first one!</p>
                <Link href="/create">
                  <Button>Get Started</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {jobs.map((job) => (
                <Card key={`${job.source}-${job.id}`} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{job.outputName || `Webinar ${job.id.slice(0, 8)}`}</CardTitle>
                        <Badge variant={job.source === "localStorage" ? "default" : "secondary"}>
                          {job.source === "localStorage" ? "Current" : "Previous"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getStatusColor(job.status)} text-white flex items-center gap-1`}>
                          {getStatusIcon(job.status)}
                          {job.status}
                        </Badge>
                        {job.source === "localStorage" && (
                          <>
                            {(job.status === "IN_QUEUE" ||
                              job.status === "IN_PROGRESS" ||
                              job.status === "NOT_FOUND" ||
                              job.status === "ERROR") && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRefreshStatus(job.id)}
                                disabled={pollingJobs.has(job.id)}
                              >
                                <RefreshCw className={`h-4 w-4 ${pollingJobs.has(job.id) ? "animate-spin" : ""}`} />
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => handleDeleteJob(job.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <CardDescription>
                      Created: {new Date(job.createdAt).toLocaleString()}
                      {job.source === "supabase" && job.supabaseData?.processing_time_seconds && (
                        <span className="ml-4">Processing time: {job.supabaseData.processing_time_seconds}s</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {job.output?.stats && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
                          {job.output.stats.total_slides && (
                            <div className="text-center">
                              <div className="text-lg font-semibold text-gray-900">{job.output.stats.total_slides}</div>
                              <div className="text-xs text-gray-600">Total Slides</div>
                            </div>
                          )}
                          {job.output.stats.final_duration && (
                            <div className="text-center">
                              <div className="text-lg font-semibold text-gray-900">
                                {job.output.stats.final_duration}
                              </div>
                              <div className="text-xs text-gray-600">Duration</div>
                            </div>
                          )}
                          {job.output.stats.final_resolution && (
                            <div className="text-center">
                              <div className="text-lg font-semibold text-gray-900">
                                {job.output.stats.final_resolution}
                              </div>
                              <div className="text-xs text-gray-600">Resolution</div>
                            </div>
                          )}
                        </div>
                      )}

                      {(job.status === "NOT_FOUND" || job.status === "ERROR") && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            {getStatusIcon(job.status)}
                            <div className="flex-1">
                              {job.error && <p className="text-sm font-medium text-red-800">{job.error}</p>}
                              {job.message && <p className="text-xs text-red-600 mt-1">{job.message}</p>}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2">
                        {hasVideoUrl(job) && job.status?.toLowerCase() === "completed" && (
                          <Button
                            onClick={() => handleDownload(job.id, job.outputName)}
                            disabled={downloadingJobs.has(job.id)}
                            className="flex items-center gap-2"
                          >
                            {downloadingJobs.has(job.id) ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4" />
                                Download Video
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
