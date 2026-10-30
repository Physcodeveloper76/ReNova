"use client"

import { AuthLayout } from "@/components/auth/auth-layout"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <AuthLayout
      title="Select Your Role"
      subtitle="Choose whether you want to sell or buy e-waste to continue"
    >
      <LoginForm />
    </AuthLayout>
  )
}
