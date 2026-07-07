import * as React from "react"

// Standard breakpoints for common device sizes
export const BREAKPOINTS = {
  xs: 480,  // Extra small devices (phones)
  sm: 640,  // Small devices (large phones, small tablets)
  md: 768,  // Medium devices (tablets)
  lg: 1024, // Large devices (laptops/desktops)
  xl: 1280, // Extra large devices (large laptops and desktops)
  xxl: 1536 // Extra extra large devices (larger desktops)
}

// Default mobile breakpoint 
const MOBILE_BREAKPOINT = BREAKPOINTS.md

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Initialize with the current window width
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

    // Create a debounced resize handler
    let timeoutId: NodeJS.Timeout | null = null
    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
      }, 100)
    }

    // Add the resize event listener
    window.addEventListener("resize", handleResize)
    
    // Clean up the event listener
    return () => {
      window.removeEventListener("resize", handleResize)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  return !!isMobile
}

// Enhanced hook for more flexible responsive design
export function useBreakpoint(breakpoint: keyof typeof BREAKPOINTS) {
  const [isBelow, setIsBelow] = React.useState<boolean | undefined>(undefined)
  const breakpointValue = React.useMemo(() => BREAKPOINTS[breakpoint], [breakpoint])

  React.useEffect(() => {
    // Initialize with the current window width
    setIsBelow(window.innerWidth < breakpointValue)
    
    // Create a debounced resize handler
    let timeoutId: NodeJS.Timeout | null = null
    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setIsBelow(window.innerWidth < breakpointValue)
      }, 100)
    }
    
    // Add the resize event listener
    window.addEventListener("resize", handleResize)
    
    // Clean up the event listener
    return () => {
      window.removeEventListener("resize", handleResize)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [breakpointValue])

  return !!isBelow
}
