"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface VisualFileEditorProps {
  filename: string
  content: string
  onChange: (content: string) => void
}

interface ParsedIdentity {
  name: string
  role: string
  emoji: string
  theme: string
}

interface ParsedSoul {
  coreValues: string
  technicalPrinciples: string
}

export function VisualFileEditor({ filename, content, onChange }: VisualFileEditorProps) {
  if (filename === "IDENTITY.md") {
    return <IdentityEditor content={content} onChange={onChange} />
  }

  if (filename === "SOUL.md") {
    return <SoulEditor content={content} onChange={onChange} />
  }

  // Fallback: Generic key-value editor
  return <GenericEditor content={content} onChange={onChange} />
}

function IdentityEditor({ content, onChange }: { content: string; onChange: (content: string) => void }) {
  const [fields, setFields] = useState<ParsedIdentity>({
    name: "",
    role: "",
    emoji: "",
    theme: "",
  })

  useEffect(() => {
    // Parse IDENTITY.md
    const nameMatch = content.match(/\*\*Name:\*\*\s*(.+)/);
    const roleMatch = content.match(/\*\*Role:\*\*\s*(.+)/);
    const emojiMatch = content.match(/\*\*Emoji:\*\*\s*(.+)/);
    const themeMatch = content.match(/\*\*Theme:\*\*\s*(.+)/);

    setFields({
      name: nameMatch ? nameMatch[1].trim() : "",
      role: roleMatch ? roleMatch[1].trim() : "",
      emoji: emojiMatch ? emojiMatch[1].trim() : "",
      theme: themeMatch ? themeMatch[1].trim() : "",
    })
  }, [content])

  const handleFieldChange = (field: keyof ParsedIdentity, value: string) => {
    const newFields = { ...fields, [field]: value }
    setFields(newFields)

    // Rebuild markdown
    const newContent = `# Identity
**Name:** ${newFields.name}
**Role:** ${newFields.role}
**Emoji:** ${newFields.emoji}
**Theme:** ${newFields.theme}
`
    onChange(newContent)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Agent Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={fields.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              placeholder="Agent name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={fields.role}
              onChange={(e) => handleFieldChange("role", e.target.value)}
              placeholder="Builder / PM / QA"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emoji">Emoji</Label>
            <Input
              id="emoji"
              value={fields.emoji}
              onChange={(e) => handleFieldChange("emoji", e.target.value)}
              placeholder="🔨"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Input
              id="theme"
              value={fields.theme}
              onChange={(e) => handleFieldChange("theme", e.target.value)}
              placeholder="Fast, precise, ships clean code"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SoulEditor({ content, onChange }: { content: string; onChange: (content: string) => void }) {
  const [fields, setFields] = useState<ParsedSoul>({
    coreValues: "",
    technicalPrinciples: "",
  })

  useEffect(() => {
    // Parse SOUL.md sections
    const coreValuesMatch = content.match(/## Core Values\n+([\s\S]*?)(?=\n##|$)/);
    const techPrinciplesMatch = content.match(/## Technical Principles\n+([\s\S]*?)(?=\n##|$)/);

    setFields({
      coreValues: coreValuesMatch ? coreValuesMatch[1].trim() : "",
      technicalPrinciples: techPrinciplesMatch ? techPrinciplesMatch[1].trim() : "",
    })
  }, [content])

  const handleFieldChange = (field: keyof ParsedSoul, value: string) => {
    const newFields = { ...fields, [field]: value }
    setFields(newFields)

    // Rebuild markdown
    const newContent = `# Soul

## Core Values
${newFields.coreValues}

## Technical Principles
${newFields.technicalPrinciples}
`
    onChange(newContent)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Core Values</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={fields.coreValues}
            onChange={(e) => handleFieldChange("coreValues", e.target.value)}
            placeholder="List core values..."
            rows={6}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Technical Principles</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={fields.technicalPrinciples}
            onChange={(e) => handleFieldChange("technicalPrinciples", e.target.value)}
            placeholder="List technical principles..."
            rows={6}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function GenericEditor({ content, onChange }: { content: string; onChange: (content: string) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Editor</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Edit content..."
          rows={12}
          className="font-mono"
        />
      </CardContent>
    </Card>
  )
}
