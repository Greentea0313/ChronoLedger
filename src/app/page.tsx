"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/auth")
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-app text-content">
      <head>
        <meta httpEquiv="refresh" content="0;url=/auth" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if (typeof window !== "undefined" && window.location.pathname === "/") { window.location.replace("/auth"); }`,
          }}
        />
      </head>
      <p role="status">로그인 페이지로 이동 중...</p>
    </main>
  )
}
