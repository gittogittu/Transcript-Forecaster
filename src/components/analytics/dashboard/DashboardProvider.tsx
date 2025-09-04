'use client'

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { DashboardState, DashboardLayout, RealTimeDataUpdate, GlobalFilter } from './types'

interface DashboardContextType {
  state: DashboardState
  updateLayout: (layout: DashboardLayout) => void
  updateGlobalFilters: (filters: Record<string, any>) => void
  toggleEditing: () => void
  selectWidget: (widgetId?: string) => void
  toggleRealTime: () => void
  updateWidgetData: (update: RealTimeDataUpdate) => void
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

type DashboardAction =
  | { type: 'UPDATE_LAYOUT'; payload: DashboardLayout }
  | { type: 'UPDATE_GLOBAL_FILTERS'; payload: Record<string, any> }
  | { type: 'TOGGLE_EDITING' }
  | { type: 'SELECT_WIDGET'; payload?: string }
  | { type: 'TOGGLE_REAL_TIME' }
  | { type: 'UPDATE_WIDGET_DATA'; payload: RealTimeDataUpdate }
  | { type: 'SET_LAST_UPDATE'; payload: Date }

const dashboardReducer = (state: DashboardState, action: DashboardAction): DashboardState => {
  switch (action.type) {
    case 'UPDATE_LAYOUT':
      return {
        ...state,
        layout: action.payload,
        lastUpdate: new Date()
      }
    
    case 'UPDATE_GLOBAL_FILTERS':
      return {
        ...state,
        globalFilters: { ...state.globalFilters, ...action.payload },
        lastUpdate: new Date()
      }
    
    case 'TOGGLE_EDITING':
      return {
        ...state,
        isEditing: !state.isEditing,
        selectedWidget: undefined
      }
    
    case 'SELECT_WIDGET':
      return {
        ...state,
        selectedWidget: action.payload
      }
    
    case 'TOGGLE_REAL_TIME':
      return {
        ...state,
        realTimeEnabled: !state.realTimeEnabled
      }
    
    case 'UPDATE_WIDGET_DATA':
      const updatedWidgets = state.layout.widgets.map(widget => {
        if (widget.id === action.payload.widgetId) {
          return {
            ...widget,
            data: action.payload.type === 'replace' 
              ? action.payload.data
              : action.payload.type === 'append'
              ? [...(widget.data || []), ...action.payload.data]
              : { ...widget.data, ...action.payload.data }
          }
        }
        return widget
      })
      
      return {
        ...state,
        layout: {
          ...state.layout,
          widgets: updatedWidgets
        },
        lastUpdate: action.payload.timestamp
      }
    
    case 'SET_LAST_UPDATE':
      return {
        ...state,
        lastUpdate: action.payload
      }
    
    default:
      return state
  }
}

const defaultLayout: DashboardLayout = {
  id: 'default',
  name: 'Default Dashboard',
  widgets: [],
  filters: [],
  refreshInterval: 30000, // 30 seconds
  isDefault: true
}

const initialState: DashboardState = {
  layout: defaultLayout,
  isEditing: false,
  selectedWidget: undefined,
  globalFilters: {},
  realTimeEnabled: false,
  lastUpdate: new Date()
}

interface DashboardProviderProps {
  children: React.ReactNode
  initialLayout?: DashboardLayout
}

export function DashboardProvider({ children, initialLayout }: DashboardProviderProps) {
  const [state, dispatch] = useReducer(dashboardReducer, {
    ...initialState,
    layout: initialLayout || defaultLayout
  })

  const updateLayout = useCallback((layout: DashboardLayout) => {
    dispatch({ type: 'UPDATE_LAYOUT', payload: layout })
  }, [])

  const updateGlobalFilters = useCallback((filters: Record<string, any>) => {
    dispatch({ type: 'UPDATE_GLOBAL_FILTERS', payload: filters })
  }, [])

  const toggleEditing = useCallback(() => {
    dispatch({ type: 'TOGGLE_EDITING' })
  }, [])

  const selectWidget = useCallback((widgetId?: string) => {
    dispatch({ type: 'SELECT_WIDGET', payload: widgetId })
  }, [])

  const toggleRealTime = useCallback(() => {
    dispatch({ type: 'TOGGLE_REAL_TIME' })
  }, [])

  const updateWidgetData = useCallback((update: RealTimeDataUpdate) => {
    dispatch({ type: 'UPDATE_WIDGET_DATA', payload: update })
  }, [])

  // Real-time data refresh effect
  useEffect(() => {
    if (!state.realTimeEnabled) return

    const interval = setInterval(() => {
      // Trigger data refresh for all widgets
      state.layout.widgets.forEach(widget => {
        if (widget.refreshInterval) {
          // This would typically trigger an API call to refresh widget data
          // For now, we'll just update the timestamp
          dispatch({ type: 'SET_LAST_UPDATE', payload: new Date() })
        }
      })
    }, state.layout.refreshInterval)

    return () => clearInterval(interval)
  }, [state.realTimeEnabled, state.layout.refreshInterval, state.layout.widgets])

  const contextValue: DashboardContextType = {
    state,
    updateLayout,
    updateGlobalFilters,
    toggleEditing,
    selectWidget,
    toggleRealTime,
    updateWidgetData
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}