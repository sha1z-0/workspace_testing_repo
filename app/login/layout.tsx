import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "WorkSpace",
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
