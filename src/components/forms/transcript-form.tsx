'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Plus, Check, AlertCircle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { TranscriptSchema, type TranscriptFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

interface TranscriptFormProps {
  onSuccess?: (data: TranscriptFormData) => void
  onError?: (error: Error) => void
  className?: string
}

export function TranscriptForm({ onSuccess, onError, className }: TranscriptFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<TranscriptFormData>({
    resolver: zodResolver(TranscriptSchema),
    defaultValues: {
      clientName: '',
      month: '',
      transcriptCount: 0,
      notes: '',
    },
    mode: 'onChange', // Enable real-time validation
  })

  // Mutation for submitting transcript data
  const submitTranscriptMutation = useMutation({
    mutationFn: async (data: TranscriptFormData) => {
      const response = await fetch('/api/transcripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to submit transcript data')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch transcript data
      queryClient.invalidateQueries({ queryKey: ['transcripts'] })
      
      // Show success state
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
      
      // Reset form
      form.reset()
      
      // Call success callback
      onSuccess?.(variables)
    },
    onError: (error: Error) => {
      console.error('Failed to submit transcript:', error)
      onError?.(error)
    },
    onSettled: () => {
      setIsSubmitting(false)
    },
  })

  const onSubmit = async (data: TranscriptFormData) => {
    setIsSubmitting(true)
    submitTranscriptMutation.mutate(data)
  }

  // Generate current month as default
  const getCurrentMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }

  // Animation variants
  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' }
    },
  }

  const buttonVariants = {
    idle: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
    loading: { scale: 1 },
  }

  return (
    <motion.div
      className={className}
      variants={formVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Transcript Data
          </CardTitle>
          <CardDescription>
            Enter new transcript data for a client. All fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Client Name Field */}
              <FormField
                control={form.control}
                name="clientName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Client Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter client name"
                        {...field}
                        className={`transition-all duration-200 ${
                          fieldState.error 
                            ? 'border-destructive focus-visible:ring-destructive/20' 
                            : 'focus-visible:ring-primary/20'
                        }`}
                      />
                    </FormControl>
                    <FormDescription>
                      The name of the client for this transcript data
                    </FormDescription>
                    <AnimatePresence mode="wait">
                      {fieldState.error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormMessage />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </FormItem>
                )}
              />

              {/* Month Field */}
              <FormField
                control={form.control}
                name="month"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Month *</FormLabel>
                    <FormControl>
                      <Input
                        type="month"
                        placeholder={getCurrentMonth()}
                        {...field}
                        className={`transition-all duration-200 ${
                          fieldState.error 
                            ? 'border-destructive focus-visible:ring-destructive/20' 
                            : 'focus-visible:ring-primary/20'
                        }`}
                      />
                    </FormControl>
                    <FormDescription>
                      Select the month for this transcript data (YYYY-MM format)
                    </FormDescription>
                    <AnimatePresence mode="wait">
                      {fieldState.error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormMessage />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </FormItem>
                )}
              />

              {/* Transcript Count Field */}
              <FormField
                control={form.control}
                name="transcriptCount"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Transcript Count *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="10000"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        className={`transition-all duration-200 ${
                          fieldState.error 
                            ? 'border-destructive focus-visible:ring-destructive/20' 
                            : 'focus-visible:ring-primary/20'
                        }`}
                      />
                    </FormControl>
                    <FormDescription>
                      Number of transcripts for this client and month (0-10,000)
                    </FormDescription>
                    <AnimatePresence mode="wait">
                      {fieldState.error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormMessage />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </FormItem>
                )}
              />

              {/* Notes Field */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional notes about this transcript data..."
                        className={`transition-all duration-200 resize-none ${
                          fieldState.error 
                            ? 'border-destructive focus-visible:ring-destructive/20' 
                            : 'focus-visible:ring-primary/20'
                        }`}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional notes or additional information (max 500 characters)
                    </FormDescription>
                    <AnimatePresence mode="wait">
                      {fieldState.error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormMessage />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <motion.div
                  variants={buttonVariants}
                  initial="idle"
                  whileHover="hover"
                  whileTap="tap"
                  animate={isSubmitting ? "loading" : "idle"}
                >
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-w-[120px] relative"
                  >
                    <AnimatePresence mode="wait">
                      {isSubmitting ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting...
                        </motion.div>
                      ) : submitSuccess ? (
                        <motion.div
                          key="success"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-2 text-green-600"
                        >
                          <Check className="h-4 w-4" />
                          Success!
                        </motion.div>
                      ) : (
                        <motion.div
                          key="submit"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Transcript
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
              </div>

              {/* Error Display */}
              <AnimatePresence>
                {submitTranscriptMutation.error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{submitTranscriptMutation.error.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default TranscriptForm