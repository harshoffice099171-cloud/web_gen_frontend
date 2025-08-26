"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, ArrowLeft, Loader2, Play, Edit2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as Tabs from '@radix-ui/react-tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Add at the top of the file, after imports
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const AUDIO_OPTIONS = [
  {
    id: "voice_1",
    name: "kishan",
    path: "audio/kishan.mp3",
  },
  {
    id: "voice_2", 
    name: "simran",
    path: "audio/simran.mp3",
  },
  {
    id: "voice_3",
    name: "srikant",
    path: "audio/srikant.mp3",
  },
  {
    id: "voice_4",
    name: "vidya", 
    path: "audio/vidya.mp3",
  },
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

interface SlideContent {
  slideNumber: number;
  title: string;
  content: string;
  script: string;
  estimatedDuration: number;
}

export default function CreatePage() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null)
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [formData, setFormData] = useState({
    presentationFile: null as File | null,
    inputVideo: null as File | null,
    selectedVideoId: "",
    selectedAudioId: "",
    voiceAudioFile: null as File | null,
    outputName: "",
    videoPosition: "",
    videoScale: "",
  })
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showScriptEditor, setShowScriptEditor] = useState(false);

  // Cleanup URLs on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (uploadedVideoUrl) {
        URL.revokeObjectURL(uploadedVideoUrl)
      }
      if (uploadedAudioUrl) {
        URL.revokeObjectURL(uploadedAudioUrl)
      }
    }
  }, [uploadedVideoUrl, uploadedAudioUrl])

  // Function to handle PDF processing
  const handlePdfProcessing = async (file: File) => {
    setIsProcessingPdf(true);
    try {
      // Load PDF.js from CDN if not loaded
      if (typeof window.pdfjsLib === 'undefined') {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
          script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            resolve();
          };
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const extractedSlides: SlideContent[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .trim();

        const lines = text.split('\n');
        const title = lines[0] || `Slide ${i}`;
        const content = lines.slice(1).join('\n') || text;

        // Generate script using Gemini
        const script = await generateScript({
          slideNumber: i,
          title,
          content,
          script: '',
          estimatedDuration: 0
        });

        extractedSlides.push({
          slideNumber: i,
          title: title.length > 100 ? title.slice(0, 100) + '...' : title,
          content,
          script,
          estimatedDuration: estimateDuration(script)
        });
      }

      setSlides(extractedSlides);
      setShowScriptEditor(true);
    } catch (error) {
      console.error('Error processing PDF:', error);
      alert('Error processing PDF file. Please try again.');
    } finally {
      setIsProcessingPdf(false);
    }
  };

  // Modified handleFileChange to include PDF processing
  const handleFileChange = (field: "presentationFile" | "inputVideo" | "voiceAudioFile") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, [field]: file }));

      if (field === "presentationFile" && file.type === "application/pdf") {
        await handlePdfProcessing(file);
      }

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

      // Create preview URL for uploaded audio
      if (field === "voiceAudioFile") {
        // Clean up previous URL to prevent memory leaks
        if (uploadedAudioUrl) {
          URL.revokeObjectURL(uploadedAudioUrl)
        }
        const audioUrl = URL.createObjectURL(file)
        setUploadedAudioUrl(audioUrl)
        // Clear selected audio when uploading custom audio
        setFormData((prev) => ({ ...prev, selectedAudioId: "" }))
      }
    }
  }

  const handleVideoSelect = (videoId: string) => {
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

  const handleAudioSelect = (audioId: string) => {
    setFormData((prev) => ({ ...prev, selectedAudioId: audioId }))

    // Clear uploaded audio when selecting from dropdown
    if (audioId) {
      // Clean up previous uploaded audio URL
      if (uploadedAudioUrl) {
        URL.revokeObjectURL(uploadedAudioUrl)
      }
      setUploadedAudioUrl(null)
      setFormData((prev) => ({ ...prev, voiceAudioFile: null }))
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
    // If there's an uploaded video file, use that
    if (formData.inputVideo && uploadedVideoUrl) {
      return uploadedVideoUrl
    }

    // Otherwise, if there's a selected video from dropdown, use that
    if (formData.selectedVideoId && !formData.inputVideo) {
      const selectedVideo = VIDEO_OPTIONS.find((v) => v.id === formData.selectedVideoId)
      return selectedVideo?.path || null
    }

    return null
  }

  const getPreviewVideoName = () => {
    if (formData.inputVideo) {
      return formData.inputVideo.name
    }
    if (formData.selectedVideoId) {
      const selectedVideo = VIDEO_OPTIONS.find((v) => v.id === formData.selectedVideoId)
      return selectedVideo?.name || "Selected Video"
    }
    return "No video selected"
  }

  const getPreviewAudioUrl = () => {
    // If there's an uploaded audio file, use that
    if (formData.voiceAudioFile && uploadedAudioUrl) {
      return uploadedAudioUrl
    }

    // Otherwise, if there's a selected audio from dropdown, use that
    if (formData.selectedAudioId && !formData.voiceAudioFile) {
      const selectedAudio = AUDIO_OPTIONS.find((a) => a.id === formData.selectedAudioId)
      return selectedAudio?.path || null
    }

    return null
  }

  const getPreviewAudioName = () => {
    if (formData.voiceAudioFile) {
      return formData.voiceAudioFile.name
    }
    if (formData.selectedAudioId) {
      const selectedAudio = AUDIO_OPTIONS.find((a) => a.id === formData.selectedAudioId)
      return selectedAudio?.name || "Selected Audio"
    }
    return "No audio selected"
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

  // Function to generate script using Gemini
  const generateScript = async (slide: SlideContent): Promise<string> => {
    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slideNumber: slide.slideNumber,
          title: slide.title,
          content: slide.content
        }),
      });

      if (!response.ok) throw new Error('Failed to generate script');
      const data = await response.json();
      return data.script;
    } catch (error) {
      console.error('Error generating script:', error);
      return slide.content || `This is slide ${slide.slideNumber}`;
    }
  };

  // Function to estimate duration
  const estimateDuration = (text: string): number => {
    const wordCount = text.split(/\s+/).length;
    return Math.max(2.0, (wordCount / 150) * 60);
  };

  // Function to handle script edit
  const handleScriptEdit = (slideIndex: number, newScript: string) => {
    setSlides(prevSlides =>
      prevSlides.map((slide, index) =>
        index === slideIndex
          ? { ...slide, script: newScript, estimatedDuration: estimateDuration(newScript) }
          : slide
      )
    );
  };

  const handleGenerate = async () => {
    if (!formData.presentationFile || (!formData.inputVideo && !formData.selectedVideoId) || (!formData.voiceAudioFile && !formData.selectedAudioId)) {
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

      let audioBase64: string
      let audioFileExtension: string
      if (formData.voiceAudioFile) {
        // Use uploaded audio
        audioBase64 = await fileToBase64(formData.voiceAudioFile)
        audioFileExtension = formData.voiceAudioFile.name.split('.').pop()?.toLowerCase() || 'mp3'
      } else {
        // Use selected audio - fetch from path and convert to base64
        const selectedAudio = AUDIO_OPTIONS.find((a) => a.id === formData.selectedAudioId)
        if (selectedAudio) {
          const response = await fetch(selectedAudio.path)
          const blob = await response.blob()
          const file = new File([blob], selectedAudio.name, { type: "audio/mp3" })
          audioBase64 = await fileToBase64(file)
          audioFileExtension = 'mp3'
        } else {
          throw new Error("Selected audio not found")
        }
      }

      // Prepare input object
      const inputData: any = {
        presentation_file: presentationBase64,
        input_video: videoBase64,
        voice_file: audioBase64,
        lipsync_type: "mustalk_realtime",
        presentation_file_type: "pdf",
        input_video_type: "mp4",
        voice_file_type: audioFileExtension,
        // Include generated and edited scripts
        slides: slides.map(slide => ({
          slideNumber: slide.slideNumber,
          title: slide.title,
          content: slide.content,
          script: slide.script,
          estimatedDuration: slide.estimatedDuration
        }))
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
      console.error('Error:', error);
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
                    disabled={isProcessingPdf}
                  />
                  <Upload className="h-5 w-5 text-gray-400" />
                </div>
                {isProcessingPdf && (
                  <p className="text-sm text-blue-600">Processing PDF and generating scripts...</p>
                )}
                {formData.presentationFile && slides.length > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-green-600">✓ {formData.presentationFile.name}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowScriptEditor(true)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Scripts
                    </Button>
                  </div>
                )}
              </div>

              {/* Voice Audio Input */}
              <div className="space-y-2">
                <Label>Voice Audio for Cloning *</Label>
                <Select value={formData.selectedAudioId} onValueChange={handleAudioSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select voice audio" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIO_OPTIONS.map((audio) => (
                      <SelectItem key={audio.id} value={audio.id}>
                        {audio.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-4 mt-2">
                  <Input 
                    type="file" 
                    accept=".mp3,.wav,.m4a" 
                    onChange={handleFileChange("voiceAudioFile")} 
                    className="flex-1" 
                  />
                  <Upload className="h-5 w-5 text-gray-400" />
                </div>
                {formData.voiceAudioFile && <p className="text-sm text-green-600">✓ {formData.voiceAudioFile.name}</p>}
                {formData.selectedAudioId && !formData.voiceAudioFile && (
                  <p className="text-sm text-blue-600">
                    ✓ Selected: {AUDIO_OPTIONS.find((a) => a.id === formData.selectedAudioId)?.name}
                  </p>
                )}
                
                {/* Audio Preview */}
                {(formData.voiceAudioFile || formData.selectedAudioId) && (
                  <div className="space-y-2">
                    {getPreviewAudioUrl() && (
                      <div className="flex items-center gap-2">
                        <audio 
                          key={`${formData.selectedAudioId}-${formData.voiceAudioFile?.name || 'none'}`}
                          controls 
                          className="max-w-xs"
                          src={getPreviewAudioUrl()!}
                        >
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Video Input */}
              <div className="space-y-2">
                <Label>Video Input *</Label>
                <Select value={formData.selectedVideoId} onValueChange={handleVideoSelect}>
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
                  (!formData.voiceAudioFile && !formData.selectedAudioId)
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

      {/* Add Script Editor Dialog */}
      <Dialog open={showScriptEditor} onOpenChange={setShowScriptEditor}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Edit Presentation Scripts</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col h-full overflow-hidden">
            <Tabs.Root
              value={currentSlide.toString()}
              onValueChange={(value) => setCurrentSlide(parseInt(value))}
            >
              <Tabs.List className="flex space-x-2 mb-4 overflow-x-auto pb-2">
                {slides.map((slide, index) => (
                  <Tabs.Trigger
                    key={index}
                    value={index.toString()}
                    className="px-4 py-2 rounded-t-lg border-b-2 data-[state=active]:border-blue-500"
                  >
                    Slide {slide.slideNumber}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              {slides.map((slide, index) => (
                <Tabs.Content
                  key={index}
                  value={index.toString()}
                  className="outline-none flex-1 overflow-auto"
                >
                  <div className="grid grid-cols-2 gap-4 h-full">
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold mb-2">Title</h3>
                        <p>{slide.title}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold mb-2">Content</h3>
                        <p className="whitespace-pre-wrap">{slide.content}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg h-full">
                        <h3 className="font-semibold mb-2">Generated Script</h3>
                        <textarea
                          value={slide.script}
                          onChange={(e) => handleScriptEdit(index, e.target.value)}
                          className="w-full h-[calc(100%-2rem)] p-2 border rounded-lg"
                          placeholder="Generated script will appear here..."
                        />
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold mb-2">Estimated Duration</h3>
                        <p>{slide.estimatedDuration.toFixed(1)} seconds</p>
                      </div>
                    </div>
                  </div>
                </Tabs.Content>
              ))}
            </Tabs.Root>

            <div className="flex justify-end mt-4 pt-4 border-t">
              <Button onClick={() => setShowScriptEditor(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
