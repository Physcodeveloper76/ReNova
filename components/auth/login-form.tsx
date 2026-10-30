"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ArrowRight, ShoppingBag, Store, MapPin, Building2, Sparkles, CheckCircle2, ShieldCheck, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { setDemoRole, UserRole } from "@/lib/auth"

interface LoginFormProps {
  onPasswordFocusChange?: (focused: boolean) => void
}

export function LoginForm({ onPasswordFocusChange }: LoginFormProps) {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<UserRole>("seller")
  const [redirectPath, setRedirectPath] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const redirect = params.get("redirect")
    if (redirect) {
      setRedirectPath(redirect)
      if (redirect.includes("sell") || redirect.includes("listings")) {
        setSelectedRole("seller")
      } else if (redirect.includes("marketplace")) {
        setSelectedRole("buyer")
      }
    }
  }, [])

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role)
    setDemoRole(role)

    toast.success(`Welcome! Continuing as ${role === "seller" ? "Seller" : "Buyer"}`)

    // Redirect to the role's corresponding page or intended redirect
    if (redirectPath) {
      router.push(redirectPath)
    } else if (role === "seller") {
      router.push("/sell")
    } else {
      router.push("/marketplace")
    }
    router.refresh()
  }

  return (
    <div className="w-full space-y-6">
      {/* Informative notice badge */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 text-foreground text-sm">
        <Zap className="w-4 h-4 text-primary shrink-0" />
        <span>Direct access enabled: choose your role below to start.</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Seller Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelectRole("seller")}
          className={`cursor-pointer rounded-2xl border-2 p-5 transition-all duration-300 ${
            selectedRole === "seller"
              ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
              : "border-border hover:border-primary/50 bg-card"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-foreground">Seller</h3>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                    List & Value
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">Sell e-waste directly to recyclers</p>
              </div>
            </div>
            {selectedRole === "seller" && (
              <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Quick photo capture & direct item listing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Set your asking price (₹) & tag GPS pickup location</span>
            </div>
          </div>

          <Button
            type="button"
            className="w-full mt-4 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl group"
            onClick={(e) => {
              e.stopPropagation()
              handleSelectRole("seller")
            }}
          >
            <span>Enter as Seller</span>
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>

        {/* Buyer Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelectRole("buyer")}
          className={`cursor-pointer rounded-2xl border-2 p-5 transition-all duration-300 ${
            selectedRole === "buyer"
              ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
              : "border-border hover:border-primary/50 bg-card"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-sm">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-foreground">Buyer / Recycler</h3>
                  <Badge variant="outline" className="bg-secondary text-secondary-foreground border-border text-xs">
                    Marketplace
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">Source & purchase recyclable e-waste</p>
              </div>
            </div>
            {selectedRole === "buyer" && (
              <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>Interactive map view of verified listings in your area</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Filter by device category, price range, and proximity</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full mt-4 h-11 border-primary/50 hover:bg-primary hover:text-primary-foreground font-medium rounded-xl group transition-all duration-300"
            onClick={(e) => {
              e.stopPropagation()
              handleSelectRole("buyer")
            }}
          >
            <span>Enter as Buyer</span>
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
