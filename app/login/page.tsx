"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (!email.trim()) {
      setError("Please enter your email address")
      setIsLoading(false)
      return
    }

    if (!password.trim()) {
      setError("Please enter your password")
      setIsLoading(false)
      return
    }

    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    // === FIX 1: Single uniform white page background — no colour seam ===
    <div className="flex min-h-screen w-full bg-white">

      {/* ===== LEFT COLUMN — transparent, just a flex container for the card ===== */}
      <div className="hidden md:flex md:w-1/2 items-center justify-center pl-6 pr-0 py-6 bg-transparent">
        {/* === FIX 2: Card fills viewport height (calc(100vh - 48px)), border-radius 20px === */}
        <div
          className="relative w-full overflow-hidden rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.18)] bg-transparent"
          style={{ height: "calc(100vh - 48px)" }}
        >
          {/* Background video — looping, muted, decorative */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-0"
          >
            <source src="/video/vid.mp4" type="video/mp4" />
          </video>

          {/* === FIX 1: Dark overlay at 28% opacity === */}
          <div
            className="absolute inset-0 z-[1]"
            style={{ background: "rgba(0, 0, 0, 0.28)", borderRadius: "20px" }}
          />

          {/* === FIX 3: Text content — top-left, left-aligned, no white glow === */}
          <div className="absolute z-[2] text-left" style={{ top: "32px", left: "24px", right: "24px" }}>
              <span className="block text-[0.8rem] font-normal text-white/80 mb-[6px]">
              Finova Workspace
            </span>
            {/* Headline — 1.35rem, left-aligned, dark drop shadow only */}
            <p
              className="text-[1.35rem] font-bold text-white leading-[1.3] m-0"
              style={{
                textShadow: "0 1px 12px rgba(0, 0, 0, 0.35)",
              }}
            >
              Your secure gateway to seamless collaboration and project management
            </p>
          </div>

          {/* === FIX 2: Copyright inside the card, bottom-left === */}
          <p
            className="absolute z-[2] text-[0.72rem] font-normal m-0"
            style={{
              bottom: "20px",
              left: "24px",
              color: "rgba(255, 255, 255, 0.65)",
            }}
          >
            &copy; 2022 WorkSpace. All rights reserved.
          </p>
        </div>
      </div>

      {/* ===== RIGHT PANEL — transparent background, inherits white from parent ===== */}
      <div className="flex w-full md:w-1/2 min-h-screen flex-col bg-transparent">

        {/* Centered form area — logo and Welcome Back share the same container */}
        <div className="flex-1 flex items-center justify-center px-[8%] lg:px-[10%] py-8">
          <div className="w-full max-w-[420px]">

            {/* Logo — inside the same constrained container as the form */}
            <img
              src="/finova-logo-full.png"
              alt="WorkSpace"
              className="h-10 w-auto mb-8"
            />

            {/* Heading */}
            <h2 className="text-[1.65rem] lg:text-[1.8rem] font-bold text-[#111827] tracking-tight">
              Welcome Back!
            </h2>

            {/* Error alert */}
            {error && (
              <div className="mt-5 flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">

              {/* Email */}
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="h-12 w-full rounded-md border border-[#d1d5db] bg-white px-4 text-[#111827] placeholder:text-[#9ca3af] focus-visible:ring-2 focus-visible:ring-[#1a3fcb]/30 focus-visible:border-[#1a3fcb] transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="h-12 w-full rounded-md border border-[#d1d5db] bg-white px-4 text-[#111827] placeholder:text-[#9ca3af] focus-visible:ring-2 focus-visible:ring-[#1a3fcb]/30 focus-visible:border-[#1a3fcb] transition-colors"
                />
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full rounded-md bg-[#111827] text-white font-semibold text-[0.95rem] hover:bg-[#1f2937] active:bg-[#111827] transition-colors disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login Now"
                )}
              </Button>
            </form>

            {/* Forgot password */}
            <p className="mt-4 text-sm text-[#6b7280]">
              Forgot password?{" "}
              <a
                href="#"
                className="text-[#1a3fcb] font-bold hover:underline"
              >
                Click here
              </a>
            </p>

            {/* Terms & Privacy — EXACT text as specified */}
            <p className="mt-8 text-xs text-[#9ca3af] text-left leading-relaxed">
              By logging in, you agree to our{" "}
              <a
                href="http://localhost:3000/login#"
                className="underline hover:text-[#6b7280] transition-colors"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="http://localhost:3000/login#"
                className="underline hover:text-[#6b7280] transition-colors"
              >
                Privacy Policy
              </a>.
            </p>

          </div>
        </div>
      </div>

      {/* ===== MOBILE — stacked layout ===== */}
      <div className="flex md:hidden flex-col w-full min-h-screen bg-white">
        {/* Video card banner at top */}
        <div className="relative w-full overflow-hidden" style={{ minHeight: "240px" }}>
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-0"
          >
            <source src="/video/vid.mp4" type="video/mp4" />
          </video>

          <div
            className="absolute inset-0 z-[1]"
            style={{ background: "rgba(0, 0, 0, 0.28)" }}
          />

          <div className="absolute z-[2] text-left" style={{ top: "24px", left: "20px", right: "20px" }}>
            <p
              className="text-[1.15rem] font-bold text-white leading-[1.3] m-0"
              style={{ textShadow: "0 1px 12px rgba(0, 0, 0, 0.35)" }}
            >
              Your secure gateway to seamless collaboration and project management
            </p>
          </div>

          <p
            className="absolute z-[2] text-[0.65rem] font-normal m-0"
            style={{
              bottom: "14px",
              left: "20px",
              color: "rgba(255, 255, 255, 0.65)",
            }}
          >
            &copy; 2022 WorkSpace. All rights reserved.
          </p>
        </div>

        {/* Logo */}
        <div className="pt-6 px-[8%]">
          <img
            src="/finova-logo-full.png"
            alt="WorkSpace"
            className="h-7 w-auto"
          />
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-[8%] py-6">
          <div className="w-full max-w-[420px]">
            <h2 className="text-[1.5rem] font-bold text-[#111827] tracking-tight">
              Welcome Back!
            </h2>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="m-email" className="sr-only">Email address</label>
                <Input
                  id="m-email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="h-11 w-full rounded-md border border-[#d1d5db] bg-white px-4 text-[#111827] placeholder:text-[#9ca3af] focus-visible:ring-2 focus-visible:ring-[#1a3fcb]/30 focus-visible:border-[#1a3fcb] transition-colors"
                />
              </div>
              <div>
                <label htmlFor="m-password" className="sr-only">Password</label>
                <Input
                  id="m-password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="h-11 w-full rounded-md border border-[#d1d5db] bg-white px-4 text-[#111827] placeholder:text-[#9ca3af] focus-visible:ring-2 focus-visible:ring-[#1a3fcb]/30 focus-visible:border-[#1a3fcb] transition-colors"
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full rounded-md bg-[#111827] text-white font-semibold text-[0.95rem] hover:bg-[#1f2937] transition-colors disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login Now"
                )}
              </Button>
            </form>

            <p className="mt-3 text-sm text-[#6b7280]">
              Forgot password?{" "}
              <a href="#" className="text-[#1a3fcb] font-bold hover:underline">Click here</a>
            </p>

            <p className="mt-6 text-xs text-[#9ca3af] text-left leading-relaxed">
              By logging in, you agree to our{" "}
              <a href="http://localhost:3000/login#" className="underline hover:text-[#6b7280] transition-colors">Terms of Service</a>{" "}
              and{" "}
              <a href="http://localhost:3000/login#" className="underline hover:text-[#6b7280] transition-colors">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
