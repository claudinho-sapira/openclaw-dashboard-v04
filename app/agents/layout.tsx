import { Nav } from "@/components/nav"

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <Nav />
      {children}
    </div>
  )
}
