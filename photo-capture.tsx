"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, Download, Trash2, ImageIcon, Usb, Wifi, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PhotoData {
  id: string
  imageUrl: string
  title: string
  description: string
  timestamp: string
  location?: string
  tags: string[]
  source: "webcam" | "sony-usb" | "sony-wifi" | "upload"
  cameraModel?: string
}

export default function PhotoCapture() {
  const [isCapturing, setIsCapturing] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [photos, setPhotos] = useState<PhotoData[]>([])
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [location, setLocation] = useState("")
  const [cameraSource, setCameraSource] = useState<"webcam" | "sony-usb" | "sony-wifi" | "upload">("webcam")
  const [sonyConnected, setSonyConnected] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    const savedPhotos = localStorage.getItem("capturedPhotos")
    if (savedPhotos) {
      setPhotos(JSON.parse(savedPhotos))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("capturedPhotos", JSON.stringify(photos))
  }, [photos])

  const startCamera = useCallback(async () => {
    try {
      let mediaStream: MediaStream

      if (cameraSource === "sony-usb") {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const sonyCamera = devices.find(
          (device) =>
            device.kind === "videoinput" &&
            (device.label.toLowerCase().includes("sony") ||
              device.label.toLowerCase().includes("ilce-7m4") ||
              device.label.toLowerCase().includes("alpha")),
        )

        if (sonyCamera) {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: sonyCamera.deviceId,
              width: { ideal: 3840 },
              height: { ideal: 2160 },
              frameRate: { ideal: 30 },
            },
            audio: false,
          })
          setSonyConnected(true)
          toast({
            title: "Sony M4 Connected!",
            description: "Using Sony Alpha 7 IV via USB streaming",
          })
        } else {
          throw new Error("Sony M4 camera not found. Make sure it's connected via USB and in streaming mode.")
        }
      } else {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        })
      }

      setStream(mediaStream)
      setIsCapturing(true)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }

      toast({
        title: "Camera started",
        description:
          cameraSource === "sony-usb" ? "Sony M4 ready for high-quality capture!" : "Ready to capture photos!",
      })
    } catch (error) {
      console.error("Error accessing camera:", error)
      toast({
        title: "Camera error",
        description: error instanceof Error ? error.message : "Unable to access camera. Please check permissions.",
        variant: "destructive",
      })
    }
  }, [toast, cameraSource])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setIsCapturing(false)
    setCurrentPhoto(null)
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const quality = cameraSource === "sony-usb" ? 0.95 : 0.8
    const imageDataUrl = canvas.toDataURL("image/jpeg", quality)
    setCurrentPhoto(imageDataUrl)

    toast({
      title: "Photo captured!",
      description:
        cameraSource === "sony-usb" ? "High-quality Sony M4 photo captured!" : "Add details and save your photo.",
    })
  }, [toast, cameraSource])

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file",
          description: "Please select an image file.",
          variant: "destructive",
        })
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const imageDataUrl = e.target?.result as string
        setCurrentPhoto(imageDataUrl)
        setCameraSource("upload")

        toast({
          title: "Photo loaded!",
          description: "Sony M4 photo ready for metadata entry.",
        })
      }
      reader.readAsDataURL(file)
    },
    [toast],
  )

  const savePhoto = useCallback(() => {
    if (!currentPhoto) return

    const photoData: PhotoData = {
      id: Date.now().toString(),
      imageUrl: currentPhoto,
      title: title || "Untitled Photo",
      description,
      timestamp: new Date().toISOString(),
      location: location || undefined,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
      source: cameraSource,
      cameraModel: cameraSource === "sony-usb" || cameraSource === "upload" ? "Sony Alpha 7 IV" : undefined,
    }

    setPhotos((prev) => [photoData, ...prev])

    setCurrentPhoto(null)
    setTitle("")
    setDescription("")
    setTags("")
    setLocation("")

    toast({
      title: "Photo saved!",
      description: `Your ${cameraSource === "sony-usb" ? "Sony M4" : ""} photo has been stored successfully.`,
    })
  }, [currentPhoto, title, description, tags, location, toast, cameraSource])

  const deletePhoto = useCallback(
    (id: string) => {
      setPhotos((prev) => prev.filter((photo) => photo.id !== id))
      toast({
        title: "Photo deleted",
        description: "Photo has been removed from storage.",
      })
    },
    [toast],
  )

  const downloadPhoto = useCallback((photo: PhotoData) => {
    const link = document.createElement("a")
    link.href = photo.imageUrl
    link.download = `${photo.title.replace(/\s+/g, "_")}_${photo.id}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  const exportAllData = useCallback(() => {
    const dataStr = JSON.stringify(photos, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement("a")
    link.href = url
    link.download = `photo_data_${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)

    toast({
      title: "Data exported",
      description: "All photo data has been downloaded as JSON.",
    })
  }, [photos, toast])

  return (
    <div className="space-y-6">
      {/* Camera Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Camera Controls - Sony M4 Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Camera Source</Label>
            <Select value={cameraSource} onValueChange={(value: any) => setCameraSource(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="webcam">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Built-in Webcam
                  </div>
                </SelectItem>
                <SelectItem value="sony-usb">
                  <div className="flex items-center gap-2">
                    <Usb className="h-4 w-4" />
                    Sony M4 (USB Streaming)
                  </div>
                </SelectItem>
                <SelectItem value="sony-wifi">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4" />
                    Sony M4 (WiFi) - Coming Soon
                  </div>
                </SelectItem>
                <SelectItem value="upload">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload from Sony M4
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 flex-wrap">
            {cameraSource === "upload" ? (
              <>
                <Button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Sony M4 Photo
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </>
            ) : !isCapturing ? (
              <Button onClick={startCamera} className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                {cameraSource === "sony-usb" ? "Connect Sony M4" : "Start Camera"}
              </Button>
            ) : (
              <>
                <Button onClick={capturePhoto} className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Capture Photo
                </Button>
                <Button onClick={stopCamera} variant="outline">
                  Stop Camera
                </Button>
              </>
            )}
          </div>

          {cameraSource === "sony-usb" && !isCapturing && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Sony M4 USB Setup:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Connect Sony Alpha 7 IV to computer via USB-C cable</li>
                <li>Set camera to "USB Streaming" mode in menu</li>
                <li>Camera will appear as webcam device</li>
                <li>Click "Connect Sony M4" to start high-quality capture</li>
              </ol>
            </div>
          )}

          {cameraSource === "sony-wifi" && (
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-900 mb-2">Sony M4 WiFi (Coming Soon):</h4>
              <p className="text-sm text-amber-800">
                WiFi integration with Sony Camera Remote API is in development. Use USB streaming or upload method for
                now.
              </p>
            </div>
          )}

          {isCapturing && (
            <div className="relative">
              <video ref={videoRef} autoPlay playsInline className="w-full max-w-md mx-auto rounded-lg border" />
              <canvas ref={canvasRef} className="hidden" />
              {sonyConnected && <Badge className="absolute top-2 right-2 bg-green-500">Sony M4 Connected</Badge>}
            </div>
          )}

          {currentPhoto && (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={currentPhoto || "/placeholder.svg"}
                  alt="Captured"
                  className="w-full max-w-md mx-auto rounded-lg border"
                />
                {(cameraSource === "sony-usb" || cameraSource === "upload") && (
                  <Badge className="absolute top-2 right-2 bg-blue-500">Sony Alpha 7 IV</Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter photo title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter location"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter photo description"
                    rows={3}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="nature, landscape, sunset"
                  />
                </div>
              </div>

              <Button onClick={savePhoto} className="w-full">
                Save Photo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Gallery */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Saved Photos ({photos.length})</CardTitle>
          {photos.length > 0 && (
            <Button onClick={exportAllData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No photos captured yet. Start by taking your first photo with your Sony M4!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden">
                  <div className="aspect-square relative">
                    <img
                      src={photo.imageUrl || "/placeholder.svg"}
                      alt={photo.title}
                      className="w-full h-full object-cover"
                    />
                    <Badge className="absolute top-2 right-2 text-xs">
                      {photo.cameraModel || (photo.source === "webcam" ? "Webcam" : "Camera")}
                    </Badge>
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold text-sm">{photo.title}</h3>
                    {photo.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{photo.description}</p>
                    )}
                    {photo.location && <p className="text-xs text-muted-foreground">📍 {photo.location}</p>}
                    <p className="text-xs text-muted-foreground">
                      {new Date(photo.timestamp).toLocaleDateString()} at{" "}
                      {new Date(photo.timestamp).toLocaleTimeString()}
                    </p>
                    {photo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {photo.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button onClick={() => downloadPhoto(photo)} size="sm" variant="outline" className="flex-1">
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      <Button onClick={() => deletePhoto(photo.id)} size="sm" variant="destructive" className="flex-1">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
