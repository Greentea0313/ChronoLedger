"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DashboardAuthRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/auth")
  }, [router])

  return null
}

