import { NextRequest, NextResponse } from 'next/server';
import { predictionEngine } from '@/lib/services/prediction-engine';

export async function GET(request: NextRequest) {
  try {
    // Test data
    const testData = [
      {
        id: '1',
        clientId: '1',
        clientName: 'Test Client',
        date: new Date('2024-01-01'),
        transcriptCount: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      },
      {
        id: '2',
        clientId: '1',
        clientName: 'Test Client',
        date: new Date('2024-01-02'),
        transcriptCount: 12,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      },
      {
        id: '3',
        clientId: '1',
        clientName: 'Test Client',
        date: new Date('2024-01-03'),
        transcriptCount: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      }
    ];

    const predictions = await predictionEngine.generatePredictions(testData, {
      clientName: 'Test Client',
      predictionType: 'daily',
      periodsAhead: 3,
      modelType: 'linear',
      confidenceLevel: 95
    });

    return NextResponse.json({
      success: true,
      predictions,
      message: 'Gemini AI predictions generated successfully'
    });

  } catch (error) {
    console.error('Gemini test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to generate predictions with Gemini AI'
    }, { status: 500 });
  }
}