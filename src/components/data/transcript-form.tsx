"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  AnimatedInput, 
  AnimatedButton, 
  FormFieldAnimation,
  FadeInView 
} from "@/components/animations"

interface TranscriptFormData {
  clientName: string
  month: string
  transcriptCount: number
  notes?: string
}

interface TranscriptFormProps {
  onSubmit: (data: TranscriptFormData) => Promise<void>
  loading?: boolean
  initialData?: Partial<TranscriptFormData>
}

export function TranscriptForm({ onSubmit, loading = false, initialData }: TranscriptFormProps) {
  const [formData, setFormData] = useState<TranscriptFormData>({
    clientName: initialData?.clientName || "",
    month: initialData?.month || "",
    transcriptCount: initialData?.transcriptCount || 0,
    notes: initialData?.notes || ""
  })
  
  const [errors, setErrors] = useState<Partial<Record<keyof TranscriptFormData, string>>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TranscriptFormData, string>> = {}

    if (!formData.clientName.trim()) {
      newErrors.clientName = "Client name is required"
    }

    if (!formData.month) {
      newErrors.month = "Month is required"
    }

    if (formData.transcriptCount < 0) {
      newErrors.transcriptCount = "Transcript count must be non-negative"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
      // Reset form on success
      setFormData({
        clientName: "",
        month: "",
        transcriptCount: 0,
        notes: ""
      })
      setErrors({})
    } catch (error) {
      console.error("Form submission error:", error)
    }
  }

  const handleInputChange = (field: keyof TranscriptFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <FadeInView>
      <Card>
        <CardHeader>
          <CardTitle>Add Transcript Data</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormFieldAnimation delay={0}>
              <AnimatedInput
                label="Client Name"
                error={errors.clientName}
                className="space-y-2"
              >
                <Input
                  value={formData.clientName}
                  onChange={(e) => handleInputChange("clientName", e.target.value)}
                  placeholder="Enter client name"
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </AnimatedInput>
            </FormFieldAnimation>

            <FormFieldAnimation delay={0.1}>
              <AnimatedInput
                label="Month"
                error={errors.month}
                className="space-y-2"
              >
                <Input
                  type="month"
                  value={formData.month}
                  onChange={(e) => handleInputChange("month", e.target.value)}
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </AnimatedInput>
            </FormFieldAnimation>

            <FormFieldAnimation delay={0.2}>
              <AnimatedInput
                label="Transcript Count"
                error={errors.transcriptCount}
                className="space-y-2"
              >
                <Input
                  type="number"
                  min="0"
                  value={formData.transcriptCount}
                  onChange={(e) => handleInputChange("transcriptCount", parseInt(e.target.value) || 0)}
                  placeholder="Enter transcript count"
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </AnimatedInput>
            </FormFieldAnimation>

            <FormFieldAnimation delay={0.3}>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Add any additional notes..."
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                  rows={3}
                />
              </div>
            </FormFieldAnimation>

            <FormFieldAnimation delay={0.4}>
              <div className="flex gap-4">
                <AnimatedButton
                  type="submit"
                  loading={loading}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "Adding..." : "Add Transcript Data"}
                </AnimatedButton>
                
                <AnimatedButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      clientName: "",
                      month: "",
                      transcriptCount: 0,
                      notes: ""
                    })
                    setErrors({})
                  }}
                  disabled={loading}
                >
                  Clear
                </AnimatedButton>
              </div>
            </FormFieldAnimation>
          </form>
        </CardContent>
      </Card>
    </FadeInView>
  )
}