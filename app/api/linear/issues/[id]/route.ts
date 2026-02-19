import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { LinearClient } from "@linear/sdk"

const LINEAR_API_KEY = process.env.LINEAR_API_KEY

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!LINEAR_API_KEY) {
    return NextResponse.json({ error: "Linear API key not configured" }, { status: 503 })
  }

  const { id } = await params

  try {
    const client = new LinearClient({ apiKey: LINEAR_API_KEY })
    const issue = await client.issue(id)
    const state = await issue.state
    const assignee = await issue.assignee
    const labels = await issue.labels()
    const comments = await issue.comments()

    // Transform comments
    const transformedComments = await Promise.all(
      comments.nodes.slice(0, 20).map(async (c) => {
        const user = await c.user
        return {
          id: c.id,
          body: c.body,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          user: user ? { name: user.displayName, avatarUrl: user.avatarUrl } : null,
        }
      })
    )

    // Sort comments newest first
    transformedComments.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({
      issue: {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description || "",
        state: state?.name || "Unknown",
        stateType: state?.type || "backlog",
        priority: issue.priority || 4,
        priorityLabel: issue.priorityLabel || "No priority",
        assignee: assignee?.displayName || null,
        createdAt: issue.createdAt.toISOString(),
        updatedAt: issue.updatedAt.toISOString(),
        startedAt: issue.startedAt?.toISOString() || null,
        completedAt: issue.completedAt?.toISOString() || null,
        url: issue.url,
        labels: labels.nodes.map(l => ({ id: l.id, name: l.name, color: l.color })),
      },
      comments: transformedComments,
    })
  } catch (error) {
    console.error("Failed to fetch issue detail:", error)
    return NextResponse.json(
      { error: "Failed to fetch issue" },
      { status: 500 }
    )
  }
}
