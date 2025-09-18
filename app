import PhotoCapture from "@/components/photo-capture"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Photo Capture App</h1>
          <p className="text-muted-foreground">Capture and store photos with metadata</p>
        </div>
        <PhotoCapture />
      </div>
    </main>
  )
}
