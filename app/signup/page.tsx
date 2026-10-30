"use client"

import { AuthLayout } from "@/components/auth/auth-layout"
import { LoginForm } from "@/components/auth/login-form"

export default function SignupPage() {
  return (
    <AuthLayout
      title="Join ReNova"
      subtitle="Select whether you want to sell or buy e-waste to get started"
    >
      <LoginForm />
    </AuthLayout>
  )
}
