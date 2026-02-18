import { Nav } from "@/components/nav"

export default function KanbanLayout({
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
