"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { InteractiveCat } from "@/components/ui/interactive-cat"

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setEmailError("")
    setPasswordError("")
    setIsLoading(true)

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.message || "Failed to login. Please check your credentials.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-background">
      {/* Left Panel - Visual Showcase (Hidden on Mobile) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-muted p-10 text-white lg:flex">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0 bg-primary">
          {/* Dynamic Abstract Shapes */}
          <div className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-blue-400/30 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 h-[600px] w-[600px] rounded-full bg-purple-500/20 blur-3xl animate-pulse delay-1000" />

          {/* Glassmorphic Overlay Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/60 backdrop-blur-[1px]" />
        </div>

        {/* Branding Content */}
        <div className="relative z-10 animate-in slide-in-from-left-10 fade-in duration-700">
          <div className="mb-2 flex items-center gap-3">
            <img 
              src="/finova-logo-full.png" 
              alt="Finova" 
              className="h-12 w-auto drop-shadow-lg"
            />
          </div>
          <p className="text-lg text-blue-100 font-light max-w-sm mt-4 leading-relaxed">
            Your secure gateway to seamless collaboration and project management.
          </p>
        </div>

        {/* 3D Visual Element */}
        <div className="relative z-10 flex-1 flex items-center justify-center my-8 animate-in zoom-in-50 fade-in duration-1000 delay-500 min-h-[400px]">
          <InteractiveCat isSecretRevealed={showPassword} />
        </div>

        {/* Bottom Feature highlight */}
        <div className="relative z-10 glass-card p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-1000 delay-300">
          <h3 className="font-semibold text-white mb-2">Connect Anywhere</h3>
          <p className="text-sm text-blue-100/80">Access your workspace securely from any device with optimized performance.</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex w-full items-center justify-center bg-background p-4 lg:w-1/2 lg:p-8 relative">
        {/* Subtle background decoration for right side */}
        <div className="absolute top-10 right-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl -z-10" />

        <div className="w-full max-w-md animate-in slide-in-from-right-8 fade-in duration-700">
          <Card className="border shadow-xl bg-card/80 backdrop-blur-xl">
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-4">
                {error && (
                  <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2 group">
                  <Label htmlFor="email" className="group-focus-within:text-primary transition-colors">Email</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@finovasolutions.tech"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (e.target.value && !validateEmail(e.target.value)) {
                          setEmailError("Please enter a valid email address");
                        } else {
                          setEmailError("");
                        }
                      }}
                      className={`transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:translate-x-1 ${emailError ? "border-red-500 focus:ring-red-500" : ""}`}
                      required
                    />
                  </div>
                  {emailError && (
                    <Alert variant="destructive" className="py-2 text-xs mt-1 animate-in slide-in-from-top-1">
                      <AlertDescription>{emailError}</AlertDescription>
                    </Alert>
                  )}
                </div>
                <div className="space-y-2 group">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="group-focus-within:text-primary transition-colors">Password</Label>
                    <a href="#" className="text-xs text-primary hover:underline" onClick={(e) => { e.preventDefault(); toast({ description: "Please contact IT support to reset password." }) }}>Forgot password?</a>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (e.target.value && e.target.value.length < 6) {
                          setPasswordError("Password must be at least 6 characters long");
                        } else {
                          setPasswordError("");
                        }
                      }}
                      className={`pr-10 transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:translate-x-1 ${passwordError ? "border-red-500 focus:ring-red-500" : ""}`}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" /><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" /><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" /><path d="m2 2 20 20" /></svg>
                      )}
                      <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                    </Button>
                  </div>
                  {passwordError && (
                    <Alert variant="destructive" className="py-2 text-xs mt-1 animate-in slide-in-from-top-1">
                      <AlertDescription>{passwordError}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <div className="mt-6 text-center text-sm text-muted-foreground animate-in fade-in delay-500 duration-1000">
            By logging in, you agree to our <a href="#" className="underline hover:text-primary transition-colors">Terms of Service</a> and <a href="#" className="underline hover:text-primary transition-colors">Privacy Policy</a>.
          </div>
        </div>
      </div>
    </div>
  )
}
