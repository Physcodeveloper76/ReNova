"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import {
  Search,
  Filter,
  MapPin,
  AlertCircle,
  Recycle,
  X,
  ChevronRight,
  SlidersHorizontal,
  IndianRupee,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import dynamic from "next/dynamic"

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center bg-secondary/50"><div className="text-muted-foreground">Loading map...</div></div> }
) as any
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
) as any
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
) as any
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
) as any

if (typeof window !== "undefined") {
  // @ts-ignore
  import("leaflet/dist/leaflet.css")
}

interface Listing {
  id: string
  seller_id: string
  product_name: string
  toxicity_level?: "High" | "Medium" | "Low"
  recyclable: boolean
  harmful_substances?: string[]
  components: string[]
  resell_value: number
  market_estimate_min: number
  market_estimate_max: number
  image_url: string | null
  latitude: number
  longitude: number
  address: string | null
  created_at: string
}

interface ListingCardProps {
  listing: Listing
  distance?: number
  onHover?: () => void
  onLeave?: () => void
  onClick?: () => void
}

function ListingCard({ listing, distance, onHover, onLeave, onClick }: ListingCardProps) {
  const displayPrice = listing.resell_value
    ? `₹${listing.resell_value.toLocaleString("en-IN")}`
    : `₹${listing.market_estimate_min.toLocaleString("en-IN")}`

  return (
    <motion.div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      className="cursor-pointer"
    >
      <Card className="overflow-hidden border-border/50 hover:border-primary/50 transition-all bg-card">
        <div className="relative aspect-video bg-gradient-to-br from-card to-secondary">
          {listing.image_url ? (
            <img
              src={listing.image_url}
              alt={listing.product_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Recycle className="w-12 h-12" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <Badge className="bg-primary/95 text-primary-foreground font-semibold shadow-sm">
              {displayPrice}
            </Badge>
          </div>
          {distance !== undefined && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="bg-background/85 backdrop-blur-sm text-xs">
                <MapPin className="w-3 h-3 mr-1 text-primary" />
                {distance.toFixed(1)} km
              </Badge>
            </div>
          )}
        </div>
        <div className="p-4 space-y-2.5">
          <div>
            <h3 className="font-semibold text-foreground line-clamp-1">{listing.product_name}</h3>
            <div className="flex items-center gap-1.5 text-sm font-bold text-primary mt-1">
              <IndianRupee className="w-4 h-4" />
              <span>{displayPrice}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{listing.address || "Available for pickup"}</span>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}


export function MarketplacePage() {
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.6139, 77.2090])
  const [mapZoom, setMapZoom] = useState(10)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [hoveredListingId, setHoveredListingId] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          setUserLocation({ lat, lng })
          setMapCenter([lat, lng])
          setMapZoom(12)
        },
        () => {
          console.log("Location access denied")
        }
      )
    }
  }, [])

  const bounds = useMemo(() => {
    const latRange = 0.1
    const lngRange = 0.1
    return {
      min_lat: (mapCenter[0] - latRange).toString(),
      max_lat: (mapCenter[0] + latRange).toString(),
      min_lng: (mapCenter[1] - lngRange).toString(),
      max_lng: (mapCenter[1] + lngRange).toString(),
    }
  }, [mapCenter])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["listings", searchQuery, bounds],
    queryFn: async () => {
      let localItems: Listing[] = []
      if (typeof window !== "undefined") {
        try {
          localItems = JSON.parse(localStorage.getItem("renova_local_listings") || "[]")
        } catch {
          localItems = []
        }
      }

      try {
        const params = new URLSearchParams({
          search: searchQuery,
          ...bounds,
        })

        const response = await fetch(`/api/listings/search?${params}`)
        if (response.ok) {
          const apiData = await response.json()
          if (apiData?.listings && apiData.listings.length > 0) {
            return { listings: [...localItems, ...apiData.listings] }
          }
        }
      } catch {
        // Fallback to local and demo listings
      }

      const defaultDemos: Listing[] = [
        {
          id: "demo-1",
          seller_id: "demo-seller-id",
          product_name: "MacBook Pro 15-inch (Scrap / Parts)",
          recyclable: true,
          components: ["Logic Board", "Display Panel", "Battery Housing"],
          resell_value: 8500,
          market_estimate_min: 7500,
          market_estimate_max: 11000,
          image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop",
          latitude: 28.6139,
          longitude: 77.2090,
          address: "Connaught Place, New Delhi",
          created_at: new Date().toISOString(),
        },
        {
          id: "demo-2",
          seller_id: "demo-seller-id",
          product_name: "iPhone 11 (Cracked Screen / Battery Fault)",
          recyclable: true,
          components: ["A13 Bionic Chip", "Camera Sensors", "Aluminum Chassis"],
          resell_value: 3800,
          market_estimate_min: 3000,
          market_estimate_max: 5000,
          image_url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop",
          latitude: 28.5355,
          longitude: 77.3910,
          address: "Sector 62, Noida",
          created_at: new Date().toISOString(),
        },
        {
          id: "demo-3",
          seller_id: "demo-seller-id",
          product_name: "Dell PowerEdge Server Scrap",
          recyclable: true,
          components: ["Dual Xeon Processors", "ECC RAM", "Power Supply"],
          resell_value: 18500,
          market_estimate_min: 15000,
          market_estimate_max: 24000,
          image_url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop",
          latitude: 28.4595,
          longitude: 77.0266,
          address: "Cyber City, Gurugram",
          created_at: new Date().toISOString(),
        },
        {
          id: "demo-4",
          seller_id: "demo-seller-id",
          product_name: "Sony Wireless Headphones",
          recyclable: true,
          components: ["40mm Drivers", "Bluetooth 5.0 Module"],
          resell_value: 950,
          market_estimate_min: 800,
          market_estimate_max: 1400,
          image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop",
          latitude: 28.7041,
          longitude: 77.1025,
          address: "Rohini, North Delhi",
          created_at: new Date().toISOString(),
        },
      ]

      const filteredDemo = defaultDemos.filter((item) =>
        !searchQuery || item.product_name.toLowerCase().includes(searchQuery.toLowerCase())
      )

      return { listings: [...localItems, ...filteredDemo] }
    },
  })

  const listings: Listing[] = data?.listings || []

  const calculateDistance = useCallback(
    (lat: number, lng: number) => {
      if (!userLocation) return undefined
      const R = 6371
      const dLat = ((lat - userLocation.lat) * Math.PI) / 180
      const dLng = ((lng - userLocation.lng) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((userLocation.lat * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c
    },
    [userLocation]
  )

  const filteredListings = useMemo(() => {
    return listings
      .map((listing) => ({
        ...listing,
        distance: calculateDistance(listing.latitude, listing.longitude),
      }))
      .sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance
        }
        return 0
      })
  }, [listings, calculateDistance])

  const createMarkerIcon = useCallback(() => {
    if (typeof window === "undefined") return null

    const { Icon } = require("leaflet")
    const color = "#0d9488"

    const svg = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2.5"/>
        <circle cx="12" cy="12" r="4" fill="white"/>
      </svg>
    `

    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to home</span>
            </Link>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search for laptops, chargers, smartphone screens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-200px)]">
        <div className="flex-1 relative">
          <MapContainer
            key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
            center={mapCenter}
            zoom={mapZoom}
            style={{ width: "100%", height: "100%", zIndex: 0 }}
            className="rounded-lg"
            whenCreated={(map: any) => {
              map.on("moveend", () => {
                const center = map.getCenter()
                setMapCenter([center.lat, center.lng])
                setMapZoom(map.getZoom())
              })
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={
                typeof window !== "undefined" && document.documentElement.classList.contains("dark")
                  ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              }
              subdomains="abcd"
            />
            {filteredListings.map((listing) => (
              <Marker
                key={listing.id}
                position={[listing.latitude, listing.longitude]}
                icon={createMarkerIcon()}
                eventHandlers={{
                  mouseover: () => setHoveredListingId(listing.id),
                  mouseout: () => setHoveredListingId(null),
                  click: () => setSelectedListing(listing),
                }}
              >
                {selectedListing?.id === listing.id && (
                  <Popup onClose={() => setSelectedListing(null)}>
                    <div className="p-2 space-y-2 min-w-[200px]">
                      <h3 className="font-semibold text-foreground">{listing.product_name}</h3>
                      <p className="text-sm font-bold text-primary">
                        {listing.resell_value
                          ? `₹${listing.resell_value.toLocaleString("en-IN")}`
                          : `₹${listing.market_estimate_min.toLocaleString("en-IN")}`}
                      </p>
                      <Badge variant="outline" className="text-primary border-primary/30">
                        Available for Pickup
                      </Badge>
                    </div>
                  </Popup>
                )}
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="w-[500px] border-l border-border overflow-y-auto bg-background">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                {isLoading ? "Loading..." : `${filteredListings.length} Items Found`}
              </h2>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No listings found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    distance={listing.distance}
                    onHover={() => setHoveredListingId(listing.id)}
                    onLeave={() => setHoveredListingId(null)}
                    onClick={() => setSelectedListing(listing)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedListing && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedListing.product_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedListing.image_url && (
                  <div className="relative aspect-video rounded-lg overflow-hidden">
                    <img
                      src={selectedListing.image_url}
                      alt={selectedListing.product_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Asking Price</p>
                    <p className="text-2xl font-bold text-primary">
                      {selectedListing.resell_value
                        ? `₹${selectedListing.resell_value.toLocaleString("en-IN")}`
                        : `₹${selectedListing.market_estimate_min.toLocaleString("en-IN")}`}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Listing Status</p>
                    <Badge className="bg-emerald-500/20 text-emerald-500 font-medium">
                      Ready for Pickup
                    </Badge>
                  </Card>
                </div>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground mb-2">Pickup Location</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-foreground">
                      {selectedListing.address || `${selectedListing.latitude.toFixed(6)}, ${selectedListing.longitude.toFixed(6)}`}
                    </p>
                  </div>
                </Card>
                {selectedListing.components && selectedListing.components.length > 0 && (
                  <Card className="p-4">
                    <p className="text-sm font-medium text-foreground mb-2">Key Parts / Description</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedListing.components.map((component, i) => (
                        <Badge key={i} variant="secondary">
                          {component}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5">
                  Request Item / Contact Seller
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
