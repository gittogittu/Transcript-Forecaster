"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TranscriptData } from '@/types/transcript'
import { Calendar, User, FileText, Clock } from 'lucide-react'

interface MobileDataTableProps {
  data: TranscriptData[]
  loading?: boolean
}

export function MobileDataTable({ data, loading = false }: MobileDataTableProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-')
    const date = new Date(parseInt(year), parseInt(monthNum) - 1)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long'
    }).format(date)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">No transcript data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <Card key={item.id || `${item.clientName}-${item.month}-${index}`} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header with client name and count */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <h3 className="font-semibold text-lg">{item.clientName}</h3>
                </div>
                <Badge variant="secondary" className="text-lg font-bold">
                  {item.transcriptCount.toLocaleString()}
                </Badge>
              </div>

              {/* Month */}
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{formatMonth(item.month)}</span>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <div>
                    <div className="font-medium">Created</div>
                    <div>{formatDate(item.createdAt)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <div>
                    <div className="font-medium">Updated</div>
                    <div>{formatDate(item.updatedAt)}</div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {item.notes && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-600 italic">{item.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}