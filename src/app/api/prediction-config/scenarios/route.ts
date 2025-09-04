/**
 * API routes for scenario modeling and what-if analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Pool } from 'pg'
import { ScenarioModelingService } from '@/lib/services/prediction-config/scenario-modeling-service'
import { WhatIfAnalysis } from '@/types/prediction-config'

// Initialize database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

const scenarioService = new ScenarioModelingService(db)

/**
 * POST /api/prediction-config/scenarios
 * Run what-if analysis with multiple scenarios
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const analysis: WhatIfAnalysis = await request.json()

    // Validate required fields
    if (!analysis.baselineConfig) {
      return NextResponse.json(
        { error: 'Baseline configuration is required' },
        { status: 400 }
      )
    }

    if (!analysis.scenarios || analysis.scenarios.length === 0) {
      return NextResponse.json(
        { error: 'At least one scenario is required' },
        { status: 400 }
      )
    }

    // Validate scenarios
    for (const scenario of analysis.scenarios) {
      if (!scenario.id || !scenario.name) {
        return NextResponse.json(
          { error: 'Each scenario must have an id and name' },
          { status: 400 }
        )
      }

      if (!scenario.variableChanges || Object.keys(scenario.variableChanges).length === 0) {
        return NextResponse.json(
          { error: 'Each scenario must have variable changes defined' },
          { status: 400 }
        )
      }
    }

    const result = await scenarioService.runWhatIfAnalysis(analysis)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error running what-if analysis:', error)
    return NextResponse.json(
      { error: 'Failed to run what-if analysis' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/prediction-config/scenarios/templates
 * Get predefined scenario templates
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return predefined scenario templates
    const templates = [
      {
        id: 'growth-optimistic',
        name: 'Optimistic Growth',
        description: 'Scenario with increased growth rate and positive market conditions',
        variableChanges: {
          growthRate: 25,
          marketConditions: [{
            id: 'market-boost',
            name: 'Market Expansion',
            factor: 1.15,
            startDate: new Date(),
            description: 'Favorable market conditions driving growth'
          }]
        }
      },
      {
        id: 'growth-conservative',
        name: 'Conservative Growth',
        description: 'Scenario with modest growth and stable conditions',
        variableChanges: {
          growthRate: 10,
          seasonalFactors: {
            0: 0.95, // Monday
            1: 1.0,  // Tuesday
            2: 1.05, // Wednesday
            3: 1.0,  // Thursday
            4: 0.9,  // Friday
            5: 0.8,  // Saturday
            6: 0.7   // Sunday
          }
        }
      },
      {
        id: 'capacity-constrained',
        name: 'Capacity Constrained',
        description: 'Scenario with capacity limitations affecting growth',
        variableChanges: {
          growthRate: 15,
          capacityConstraints: [{
            id: 'max-capacity',
            name: 'Maximum Processing Capacity',
            maxValue: 1000,
            startDate: new Date(),
            description: 'System capacity limitation'
          }]
        }
      },
      {
        id: 'seasonal-peak',
        name: 'Seasonal Peak',
        description: 'Scenario modeling seasonal peak periods',
        variableChanges: {
          seasonalFactors: {
            0: 1.2, // Monday peak
            1: 1.3, // Tuesday peak
            2: 1.4, // Wednesday peak
            3: 1.3, // Thursday peak
            4: 1.1, // Friday
            5: 0.8, // Saturday low
            6: 0.6  // Sunday low
          },
          externalEvents: [{
            id: 'holiday-season',
            name: 'Holiday Season',
            startDate: new Date(),
            impact: 30,
            description: 'Increased activity during holiday season'
          }]
        }
      },
      {
        id: 'economic-downturn',
        name: 'Economic Downturn',
        description: 'Scenario modeling economic challenges',
        variableChanges: {
          growthRate: -15,
          marketConditions: [{
            id: 'economic-pressure',
            name: 'Economic Downturn',
            factor: 0.85,
            startDate: new Date(),
            description: 'Reduced activity due to economic conditions'
          }]
        }
      }
    ]

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching scenario templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scenario templates' },
      { status: 500 }
    )
  }
}