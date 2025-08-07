"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, ArrowLeft, Loader2, Play, Pause } from 'lucide-react'
import Link from "next/link"
import { useRouter } from "next/navigation"

const VOICE_OPTIONS = [
  { id: "eA8FmgNe2rjMWPK5PQQZ", name: "Shrikant (Middle aged)" },
  { id: "KSsyodh37PbfWy29kPtx", name: "Kishan (Young)" },
  { id: "HSdLdxNgP1KF3yQK3IkB", name: "Vidya (Middle aged)" },
  { id: "TRnaQb7q41oL7sV0w6Bu", name: "Simran (Young)" },
]

const VIDEO_OPTIONS = [
  {
    id: "presenter_1",
    name: "Ravik",
    path: "https://files2.heygen.ai/avatar/v3/c0f3a6642c794502b3ee0bfd9658c649/full/2.2/preview_video_target.mp4",
  },
  {
    id: "presenter_2",
    name: "Saraiya",
    path: "https://files2.heygen.ai/avatar/v3/4474c1c920c940d49c74f4e0a305dd08/full/2.2/preview_video_target.mp4",
  },
  {
    id: "presenter_3",
    name: "Sneha",
    path: "https://files2.heygen.ai/avatar/v3/83e6f555e8664302a6e7a37fe20258db/full/2.2/preview_video_target.mp4",
  },
   {
    id: "presenter_4",
    name: "Kairoan",
    path: "https://files2.heygen.ai/avatar/v3/6674b94a7a75429a9e11990d23736ed5/full/2.2/preview_video_target.mp4",
  },
]

const POSITION_OPTIONS = [
  { value: "top-right", label: "Top Right" },
  { value: "top-left", label: "Top Left" },
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
]

const SCALE_OPTIONS = [
  { value: "0.15", label: "0.15 (Small)" },
  { value: "0.25", label: "0.25 (Medium)" },
  { value: "0.35", label: "0.35 (Large)" },
]

export default function CreatePage() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [formData, setFormData] = useState({
    presentationFile: null as File | null,
    inputVideo: null as File | null,
    selectedVideoId: "",
    voiceId: "",
    outputName: "",
    videoPosition: "",
    videoScale: "",
  })

  const handleFileChange = (field: "presentationFile" | "inputVideo") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, [field]: file }))
      
      // Create preview URL for uploaded video
      if (field === "inputVideo") {
        // Clean up previous URL to prevent memory leaks
        if (uploadedVideoUrl) {
          URL.revokeObjectURL(uploadedVideoUrl)
        }
        const videoUrl = URL.createObjectURL(file)
        setUploadedVideoUrl(videoUrl)
        // Clear selected video when uploading custom video
        setFormData((prev) => ({ ...prev, selectedVideoId: "" }))
      }
    }
  }

const handleVideoSelect = (videoId: string) => {
  console.log("Video selected:", videoId) // Debug log
  setFormData((prev) => ({ ...prev, selectedVideoId: videoId }))
  
  // Clear uploaded video when selecting from dropdown
  if (videoId) {
    // Clean up previous uploaded video URL
    if (uploadedVideoUrl) {
      URL.revokeObjectURL(uploadedVideoUrl)
    }
    setUploadedVideoUrl(null)
    setFormData((prev) => ({ ...prev, inputVideo: null }))
  }
}

  const toggleVideoPlayback = (videoElement: HTMLVideoElement) => {
    if (videoElement.paused) {
      videoElement.play()
      setIsVideoPlaying(true)
    } else {
      videoElement.pause()
      setIsVideoPlaying(false)
    }
  }

const getPreviewVideoUrl = () => {
  console.log("Getting preview URL:", {
    hasUploadedFile: !!formData.inputVideo,
    hasUploadedUrl: !!uploadedVideoUrl,
    selectedVideoId: formData.selectedVideoId
  })
  
  // If there's an uploaded video file, use that
  if (formData.inputVideo && uploadedVideoUrl) {
    console.log("Using uploaded video URL:", uploadedVideoUrl)
    return uploadedVideoUrl
  }
  
  // Otherwise, if there's a selected video from dropdown, use that
  if (formData.selectedVideoId && !formData.inputVideo) {
    const selectedVideo = VIDEO_OPTIONS.find(v => v.id === formData.selectedVideoId)
    console.log("Using selected video:", selectedVideo?.path)
    return selectedVideo?.path || null
  }
  
  console.log("No video URL available")
  return null
}

  const getPreviewVideoName = () => {
    if (formData.inputVideo) {
      return formData.inputVideo.name
    }
    if (formData.selectedVideoId) {
      const selectedVideo = VIDEO_OPTIONS.find(v => v.id === formData.selectedVideoId)
      return selectedVideo?.name || "Selected Video"
    }
    return "No video selected"
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(",")[1]) // Remove data:type;base64, prefix
      }
      reader.onerror = (error) => reject(error)
    })
  }

  const handleGenerate = async () => {
    if (!formData.presentationFile || (!formData.inputVideo && !formData.selectedVideoId) || !formData.voiceId) {
      alert("Please fill in all required fields")
      return
    }

    setIsGenerating(true)

    try {
      const presentationBase64 = await fileToBase64(formData.presentationFile)

      let videoBase64: string
      if (formData.inputVideo) {
        // Use uploaded video
        videoBase64 = await fileToBase64(formData.inputVideo)
      } else {
        // Use selected video - fetch from path and convert to base64
        const selectedVideo = VIDEO_OPTIONS.find((v) => v.id === formData.selectedVideoId)
        if (selectedVideo) {
          const response = await fetch(selectedVideo.path)
          const blob = await response.blob()
          const file = new File([blob], selectedVideo.name, { type: "video/mp4" })
          videoBase64 = await fileToBase64(file)
        } else {
          throw new Error("Selected video not found")
        }
      }

      // Prepare input object
      const inputData: any = {
        presentation_file: presentationBase64,
        input_video: videoBase64,
        voice_id: formData.voiceId,
        lipsync_type: "mustalk_realtime",
        presentation_file_type: "pdf",
        input_video_type: "mp4",
      }

      // Add optional fields only if they have values
      if (formData.outputName) {
        inputData.output_name = formData.outputName
      }
      if (formData.videoScale) {
        inputData.video_scale = Number.parseFloat(formData.videoScale)
      }
      if (formData.videoPosition) {
        inputData.video_position = formData.videoPosition
      }

      // Get the current domain for webhook URL
      const currentDomain = window.location.origin

      // Wrap in payload structure with webhook
      const payload = {
        input: inputData,
        webhook: `${currentDomain}/api/webhook`,
      }

      // Call API through our backend route
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.id) {
        // Save job to localStorage
        const existingJobs = JSON.parse(localStorage.getItem("webinar-jobs") || "[]")
        const newJob = {
          id: result.id,
          status: result.status || "IN_QUEUE",
          createdAt: new Date().toISOString(),
          outputName: formData.outputName,
        }

        const updatedJobs = [newJob, ...existingJobs]
        localStorage.setItem("webinar-jobs", JSON.stringify(updatedJobs))

        // Redirect to home page
        router.push("/")
      } else {
        alert("Failed to create job. Please try again.")
      }
    } catch (error) {
      console.error("Error generating webinar:", error)
      alert("An error occurred. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" className="mb-4 bg-transparent">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Jobs
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Webinar</h1>
          <p className="text-gray-600">Upload your presentation and configure your webinar settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <Card>
            <CardHeader>
              <CardTitle>Webinar Configuration</CardTitle>
              <CardDescription>Fill in the details to generate your webinar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* PDF Upload */}
              <div className="space-y-2">
                <Label htmlFor="pdf-upload">Presentation File (PDF) *</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange("presentationFile")}
                    className="flex-1"
                  />
                  <Upload className="h-5 w-5 text-gray-400" />
                </div>
                {formData.presentationFile && (
                  <p className="text-sm text-green-600">✓ {formData.presentationFile.name}</p>
                )}
              </div>

              {/* Voice Selection */}
              <div className="space-y-2">
                <Label>Voice Selection *</Label>
                <Select
                  value={formData.voiceId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, voiceId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICE_OPTIONS.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Video Input */}
              <div className="space-y-2">
                <Label>Video Input *</Label>
                <Select
                  value={formData.selectedVideoId}
                  onValueChange={handleVideoSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select video input" />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_OPTIONS.map((video) => (
                      <SelectItem key={video.id} value={video.id}>
                        {video.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-4 mt-2">
                  <Input type="file" accept=".mp4,.avi" onChange={handleFileChange("inputVideo")} className="flex-1" />
                  <Upload className="h-5 w-5 text-gray-400" />
                </div>
                {formData.inputVideo && <p className="text-sm text-green-600">✓ {formData.inputVideo.name}</p>}
                {formData.selectedVideoId && !formData.inputVideo && (
                  <p className="text-sm text-blue-600">
                    ✓ Selected: {VIDEO_OPTIONS.find((v) => v.id === formData.selectedVideoId)?.name}
                  </p>
                )}
              </div>

              {/* Video Position */}
              <div className="space-y-2">
                <Label>Video Position (Optional)</Label>
                <Select
                  value={formData.videoPosition}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, videoPosition: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select video position" />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITION_OPTIONS.map((position) => (
                      <SelectItem key={position.value} value={position.value}>
                        {position.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Video Scale */}
              <div className="space-y-2">
                <Label>Video Scale (Optional)</Label>
                <Select
                  value={formData.videoScale}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, videoScale: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select video scale" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCALE_OPTIONS.map((scale) => (
                      <SelectItem key={scale.value} value={scale.value}>
                        {scale.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Output Name */}
              <div className="space-y-2">
                <Label htmlFor="output-name">Output Name (Optional)</Label>
                <Input
                  id="output-name"
                  placeholder="Enter output filename"
                  value={formData.outputName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, outputName: e.target.value }))}
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={
                  isGenerating ||
                  !formData.presentationFile ||
                  (!formData.inputVideo && !formData.selectedVideoId) ||
                  !formData.voiceId
                }
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Webinar"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Video Preview Section */}
          <Card>
            <CardHeader>
              <CardTitle>Video Preview</CardTitle>
              <CardDescription>Preview of your selected video input</CardDescription>
            </CardHeader>
            <CardContent>
              {getPreviewVideoUrl() ? (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    <video
                      key={getPreviewVideoUrl()} // This forces re-render when URL changes
                      className="w-full h-full object-cover"
                      controls
                      preload="metadata"
                      onPlay={() => setIsVideoPlaying(true)}
                      onPause={() => setIsVideoPlaying(false)}
                      onEnded={() => setIsVideoPlaying(false)}
                      onLoadStart={() => console.log("Video loading started")}
                      onLoadedData={() => console.log("Video loaded successfully")}
                      onError={(e) => console.error("Video error:", e)}
                    >
                      <source src={getPreviewVideoUrl()!} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">{getPreviewVideoName()}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      This video will be used as the presenter in your webinar
                    </p>
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                      <Play className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-medium">No video selected</p>
                    <p className="text-xs mt-1">Choose a video from the dropdown or upload your own</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
