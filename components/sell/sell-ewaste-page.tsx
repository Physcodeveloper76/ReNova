"use client"

import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Webcam from "react-webcam"
import {
  Camera,
  Upload,
  MapPin,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  X,
  IndianRupee,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { getCurrentUser } from "@/lib/auth"

type Phase = "details" | "locate"

const CATEGORIES = [
  "Laptops & Computers",
  "Smartphones & Tablets",
  "Batteries & Power Supplies",
  "Industrial Equipment & Servers",
  "Cables & Accessories",
  "Monitors & Displays",
  "Circuit Boards & Components",
  "Other Electronics",
]

const CONDITIONS = [
  { label: "Working Condition", desc: "Turns on and fully functional" },
  { label: "Repairable / Faulty", desc: "Minor hardware or software defects" },
  { label: "For Spare Parts / Scrap", desc: "Non-functional, sold for parts or recycling" },
]

export function SellEwastePage() {
  const router = useRouter()
  const webcamRef = useRef<Webcam>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>("details")
  const [captureMode, setCaptureMode] = useState<"camera" | "upload">("upload")
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  // Item Details Form
  const [productName, setProductName] = useState("")
  const [category, setCategory] = useState("Laptops & Computers")
  const [condition, setCondition] = useState("For Spare Parts / Scrap")
  const [price, setPrice] = useState("")
  const [description, setDescription] = useState("")

  // Location & Publishing
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [manualAddress, setManualAddress] = useState("")
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setCapturedImage(imageSrc)
      toast.success("Photo captured successfully")
    }
  }, [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setCapturedImage(result)
        toast.success("Image uploaded successfully")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleProceedToLocation = (e: React.FormEvent) => {
    e.preventDefault()

    if (!productName.trim()) {
      toast.error("Please enter a product title")
      return
    }

    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      toast.error("Please enter a valid asking price (in ₹)")
      return
    }

    setPhase("locate")
    // Pre-populate manual address if already obtained
    if (location?.address && !manualAddress) {
      setManualAddress(location.address)
    }
  }

  const getLocation = () => {
    setIsGettingLocation(true)
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser")
      setIsGettingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        try {
          const response = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${process.env.NEXT_PUBLIC_OPENCAGE_API_KEY || ""}`
          )
          const data = await response.json()
          const address = data.results?.[0]?.formatted || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`

          setLocation({ lat: latitude, lng: longitude, address })
          setManualAddress(address)
          setIsGettingLocation(false)
          toast.success("Location tagged via GPS!")
        } catch {
          const fallback = `Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          setLocation({
            lat: latitude,
            lng: longitude,
            address: fallback,
          })
          setManualAddress(fallback)
          setIsGettingLocation(false)
        }
      },
      () => {
        toast.error("Location permission denied. You can enter your pickup address manually below.")
        setIsGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const publishListing = async () => {
    const finalAddress = manualAddress.trim() || location?.address

    if (!finalAddress) {
      toast.error("Please provide or tag a pickup address")
      return
    }

    setIsPublishing(true)

    try {
      const user = await getCurrentUser()
      if (!user) {
        throw new Error("Please enter as a Seller to publish listings")
      }

      const numericPrice = Number(price) || 0
      const lat = location?.lat || 28.6139
      const lng = location?.lng || 77.2090

      const newListingData = {
        id: `listing-${Date.now()}`,
        seller_id: user.id,
        product_name: productName.trim(),
        category,
        condition,
        description: description.trim(),
        resell_value: numericPrice,
        market_estimate_min: Math.round(numericPrice * 0.9),
        market_estimate_max: Math.round(numericPrice * 1.1),
        image_url: capturedImage,
        latitude: lat,
        longitude: lng,
        address: finalAddress,
        recyclable: true,
        toxicity_level: "Low",
        harmful_substances: [],
        components: [category],
        created_at: new Date().toISOString(),
        status: "active",
      }

      try {
        const response = await fetch("/api/listings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(newListingData),
        })

        if (!response.ok) {
          throw new Error("Local fallback")
        }
      } catch {
        // Fallback to storing in localStorage
        if (typeof window !== "undefined") {
          const stored = JSON.parse(localStorage.getItem("renova_local_listings") || "[]")
          stored.unshift(newListingData)
          localStorage.setItem("renova_local_listings", JSON.stringify(stored))
        }
      }

      toast.success("Listing published successfully!")
      router.push("/marketplace")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish listing")
    } finally {
      setIsPublishing(false)
    }
  }

  const resetFlow = () => {
    setPhase("details")
    setCapturedImage(null)
    setProductName("")
    setPrice("")
    setDescription("")
    setLocation(null)
    setManualAddress("")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">List E-Waste for Sale</h1>
              <p className="text-muted-foreground mt-1">
                Enter item details and your pickup location to connect with buyers directly
              </p>
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex bg-primary/10 text-primary border-primary/20">
              Seller Mode
            </Badge>
          </div>
        </div>

        {/* 2-Step Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            {[
              { id: "details", label: "Item Details & Photo", number: 1 },
              { id: "locate", label: "Location & Publish", number: 2 },
            ].map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      phase === step.id
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-2 ring-primary/30"
                        : phase === "locate" && step.id === "details"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {phase === "locate" && step.id === "details" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      phase === step.id ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < 1 && (
                  <div
                    className={`h-0.5 w-16 md:w-28 mx-4 transition-all ${
                      phase === "locate" ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {phase === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <form onSubmit={handleProceedToLocation} className="space-y-6">
                {/* Photo Upload / Capture Section */}
                <Card className="p-6 border-border/60 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Item Photo</h3>
                      <p className="text-xs text-muted-foreground">Upload a photo or capture one with your camera</p>
                    </div>

                    {!capturedImage && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={captureMode === "upload" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCaptureMode("upload")}
                        >
                          <Upload className="w-4 h-4 mr-1.5" />
                          Upload File
                        </Button>
                        <Button
                          type="button"
                          variant={captureMode === "camera" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCaptureMode("camera")}
                        >
                          <Camera className="w-4 h-4 mr-1.5" />
                          Use Webcam
                        </Button>
                      </div>
                    )}
                  </div>

                  {capturedImage ? (
                    <div className="relative aspect-video max-h-72 w-full rounded-xl overflow-hidden border border-border/80 bg-black/5 flex items-center justify-center">
                      <img src={capturedImage} alt="Uploaded item" className="w-full h-full object-contain" />
                      <div className="absolute top-3 right-3 flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="bg-background/80 backdrop-blur-sm"
                          onClick={() => setCapturedImage(null)}
                        >
                          <RefreshCw className="w-4 h-4 mr-1.5" />
                          Change Photo
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => setCapturedImage(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : captureMode === "camera" ? (
                    <div className="relative aspect-video max-h-72 w-full rounded-xl overflow-hidden border border-border/80 bg-black flex items-center justify-center">
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: "environment" }}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        size="lg"
                        onClick={capturePhoto}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                      >
                        <Camera className="w-5 h-5 mr-2" />
                        Capture Snap
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border/80 hover:border-primary/50 transition-colors rounded-xl p-8 text-center cursor-pointer bg-secondary/10"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="font-medium text-foreground">Click to upload photo of the e-waste</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or WEBP up to 10MB</p>
                    </div>
                  )}
                </Card>

                {/* Details Form Card */}
                <Card className="p-6 border-border/60 shadow-sm space-y-5">
                  <h3 className="text-lg font-semibold text-foreground">Item Information</h3>

                  {/* Title */}
                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-sm font-medium">
                      Product Name / Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g. Dell Inspiron 15 Laptop (Intel i5, 8GB RAM)"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>

                  {/* Category and Condition */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Condition</Label>
                      <Select value={condition} onValueChange={setCondition}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITIONS.map((cond) => (
                            <SelectItem key={cond.label} value={cond.label}>
                              {cond.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Expected Price */}
                  <div className="space-y-1.5">
                    <Label htmlFor="price" className="text-sm font-medium">
                      Expected Asking Price (₹) <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <IndianRupee className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        id="price"
                        type="number"
                        placeholder="e.g. 1500"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="pl-9 h-11"
                        min="1"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Set the price you want to receive from buyers or recyclers
                    </p>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label htmlFor="desc" className="text-sm font-medium">
                      Description & Notes (Optional)
                    </Label>
                    <Textarea
                      id="desc"
                      placeholder="e.g. Device does not turn on. Screen is undamaged. Comes with original charger and battery."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="pt-2">
                    <Button type="submit" size="lg" className="w-full h-12 text-base font-medium">
                      <span>Continue to Pickup Location</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </Card>
              </form>
            </motion.div>
          )}

          {phase === "locate" && (
            <motion.div
              key="locate"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Item Summary Preview */}
              <Card className="p-4 border-border/60 bg-card/60">
                <div className="flex items-center gap-4">
                  {capturedImage ? (
                    <img
                      src={capturedImage}
                      alt={productName}
                      className="w-16 h-16 rounded-lg object-cover border border-border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                      <Package className="w-8 h-8" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground truncate">{productName}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">₹{Number(price).toLocaleString("en-IN")}</span>
                      <span>•</span>
                      <span>{condition}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setPhase("details")}>
                    Edit Details
                  </Button>
                </div>
              </Card>

              {/* Set Location Card */}
              <Card className="p-6 border-border/60 shadow-sm space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-1">Set Pickup Location</h3>
                  <p className="text-sm text-muted-foreground">
                    Tag your location so nearby buyers on the marketplace map can locate and arrange pickup
                  </p>
                </div>

                {/* GPS Trigger Button */}
                <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <p className="font-medium text-sm text-foreground">Automatic GPS Detection</p>
                    <p className="text-xs text-muted-foreground">
                      {location ? `Tagged: ${location.address}` : "Click to detect your current device coordinates"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={location ? "outline" : "default"}
                    onClick={getLocation}
                    disabled={isGettingLocation}
                    className="shrink-0"
                  >
                    {isGettingLocation ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Detecting...
                      </>
                    ) : location ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2 text-primary" />
                        Re-tag GPS
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4 mr-2" />
                        Use My Current GPS
                      </>
                    )}
                  </Button>
                </div>

                {/* Address Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-sm font-medium">
                    Pickup Address / Landmark <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="address"
                    placeholder="e.g. Flat 402, Green Valley Apartments, Connaught Place, New Delhi"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    className="h-11"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    You can refine or type the address where buyers will pick up the item.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPhase("details")}
                    className="flex-1 h-12"
                  >
                    ← Back to Details
                  </Button>
                  <Button
                    type="button"
                    onClick={publishListing}
                    disabled={(!manualAddress && !location) || isPublishing}
                    className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-base shadow-md"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Publishing Listing...
                      </>
                    ) : (
                      "Publish Listing Now"
                    )}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
