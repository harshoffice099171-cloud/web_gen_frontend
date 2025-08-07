"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Play, RefreshCw, Trash2, AlertTriangle, AlertCircle } from 'lucide-react'
import Link from "next/link"
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
}

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pollingJobs, setPollingJobs] = useState<Set<string>>(new Set())
  const [downloadingJobs, setDownloadingJobs] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Load jobs from localStorage with error handling
    try {
      if (typeof window !== "undefined") {
        const savedJobs = localStorage.getItem("webinar-jobs")
        if (savedJobs) {
          const parsedJobs = JSON.parse(savedJobs)
          if (Array.isArray(parsedJobs)) {
            setJobs(parsedJobs)
          }
        }
      }
    } catch (error) {
      console.error("Error loading jobs from localStorage:", error)
      // Clear corrupted data
      if (typeof window !== "undefined") {
        localStorage.removeItem("webinar-jobs")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Start polling for jobs that are in progress when page loads
    if (!isLoading && jobs.length > 0) {
      jobs.forEach((job) => {
        if (job.status === "IN_QUEUE" || job.status === "IN_PROGRESS") {
          console.log(`Auto-starting polling for job ${job.id} with status ${job.status}`)
          // Add a small delay to avoid overwhelming the API
          setTimeout(() => {
            pollJobStatus(job.id)
          }, Math.random() * 2000) // Random delay between 0-2 seconds
        }
      })
    }
  }, [isLoading, jobs.length])

  useEffect(() => {
    // Save jobs to localStorage whenever jobs change
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("webinar-jobs", JSON.stringify(jobs))
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

    setPollingJobs(prev => new Set(prev).add(jobId))

    try {
      console.log(`Polling status for job: ${jobId}`)
      const response = await fetch(`/api/status/${jobId}`)
      
      if (response.status === 404) {
        // Job not found, mark as not found
        const data = await response.json()
        setJobs((prevJobs) =>
          prevJobs.map((job) =>
            job.id === jobId 
              ? { 
                  ...job, 
                  status: "NOT_FOUND", 
                  error: data.error,
                  message: data.message
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
                  message: "Failed to get job status"
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
                message: undefined
              } 
            : job,
        ),
      )

      // Continue polling if job is still in progress
      if (data.status === "IN_QUEUE" || data.status === "IN_PROGRESS") {
        console.log(`Job ${jobId} still in progress (${data.status}), continuing to poll...`)
        setTimeout(() => {
          setPollingJobs(prev => {
            const newSet = new Set(prev)
            newSet.delete(jobId)
            return newSet
          })
          pollJobStatus(jobId)
        }, 5000) // Poll every 5 seconds
      } else {
        console.log(`Job ${jobId} completed with status: ${data.status}`)
        setPollingJobs(prev => {
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
                message: "Failed to connect to status API"
              } 
            : job,
        ),
      )
      setPollingJobs(prev => {
        const newSet = new Set(prev)
        newSet.delete(jobId)
        return newSet
      })
    }
  }

  const handleRefreshStatus = (jobId: string) => {
    pollJobStatus(jobId)
  }

  const handleDeleteJob = (jobId: string) => {
    setJobs((prevJobs) => prevJobs.filter((job) => job.id !== jobId))
  }

  const handleClearAllJobs = () => {
    setJobs([])
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

  const getDownloadUrl = (job: Job) => {
    // Prefer presigned URL for downloads, fallback to S3 URL
    return job.output?.final_video_presigned_url || job.output?.final_video_s3_url
  }

  const hasVideoUrl = (job: Job) => {
    return !!(job.output?.final_video_presigned_url || job.output?.final_video_s3_url)
  }

  const handleDownload = async (jobId: string, outputName?: string) => {
    const job = jobs.find(j => j.id === jobId)
    if (!job) return

    const downloadUrl = getDownloadUrl(job)
    if (!downloadUrl) {
      alert("No download URL available for this video")
      return
    }

    setDownloadingJobs(prev => new Set(prev).add(jobId))

    try {
      console.log("Attempting to download video from presigned URL:", downloadUrl)
      
      // For presigned URLs, direct download should work
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = outputName || `webinar-${jobId}.mp4`
      
      // Set additional attributes for better compatibility
      link.setAttribute('target', '_blank')
      link.setAttribute('rel', 'noopener noreferrer')
      
      // Add to DOM, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log("Download initiated successfully")
      
    } catch (error) {
      console.error("Error downloading file:", error)
      alert(`Error downloading file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDownloadingJobs(prev => {
        const newSet = new Set(prev)
        newSet.delete(jobId)
        return newSet
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Webinar Generator</h1>
          <p className="text-gray-600">Create engaging webinars from your presentations</p>
        </div>

        <div className="flex justify-center mb-8">
          <Link href="/create">
            <Button size="lg" className="px-8 py-3 text-lg">
              <Play className="mr-2 h-5 w-5" />
              Start Job
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-800">Job Status</h2>
            {jobs.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Clear All Jobs
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to clear all job history? This action cannot be undone and will remove all job records from your browser.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAllJobs} className="bg-red-600 hover:bg-red-700">
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {jobs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No jobs created yet. Click "Start Job" to begin!</p>
              </CardContent>
            </Card>
          ) : (
            jobs.map((job) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Job ID: {job.id}</CardTitle>
                      <CardDescription>
                        Created: {job.createdAt ? new Date(job.createdAt).toLocaleString() : "Unknown"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getStatusColor(job.status)} flex items-center gap-1`}>
                        {getStatusIcon(job.status)}
                        {job.status || "Unknown"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRefreshStatus(job.id)}
                        disabled={pollingJobs.has(job.id)}
                        title="Check job status"
                      >
                        <RefreshCw className={`h-4 w-4 ${pollingJobs.has(job.id) ? "animate-spin" : ""}`} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Job</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this job record? This will only remove it from your browser history.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteJob(job.id)} className="bg-red-600 hover:bg-red-700">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          Status: <span className="font-medium">{job.status || "Unknown"}</span>
                        </p>
                      </div>
                      {job.outputName && (
                        <p className="text-xs text-gray-500">
                          {job.outputName}
                        </p>
                      )}
                    </div>

                    {/* Show polling status for in-progress jobs */}
                    {(job.status === "IN_QUEUE" || job.status === "IN_PROGRESS") && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <RefreshCw className={`h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0 ${pollingJobs.has(job.id) ? "animate-spin" : ""}`} />
                          <div>
                            <p className="text-sm font-medium text-blue-800">
                              {pollingJobs.has(job.id) ? "Checking status..." : "Job in progress"}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              Status updates automatically every 5 seconds. Webhooks also provide real-time updates.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Show error message if job has error */}
                    {(job.error || job.message) && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            {job.error && (
                              <p className="text-sm font-medium text-red-800">{job.error}</p>
                            )}
                            {job.message && (
                              <p className="text-xs text-red-600 mt-1">{job.message}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Download button */}
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
            ))
          )}
        </div>
      </div>
    </div>
  )
}
