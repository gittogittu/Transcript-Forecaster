export type ProjectType = 'sales' | 'finance' | 'transcripts' | 'support' | 'operations' | 'custom'

export interface Project {
    id: string
    name: string
    description?: string
    project_type: ProjectType
    color: string
    icon: string
    is_active: boolean
    created_at: Date | string
    updated_at: Date | string
}

export interface ProjectWithStats extends Project {
    data_source_count: number
    total_records: number
    active_sources: number
    avg_growth?: number
}

export interface ProjectAnalytics {
    total_data_sources: number
    total_records: number
    avg_growth: number
    active_sources: number
    inactive_sources: number
    growth_trend: 'up' | 'down' | 'stable'
    latest_record_date?: string
}

export interface CreateProjectInput {
    name: string
    description?: string
    project_type: ProjectType
    color?: string
    icon?: string
}

export interface UpdateProjectInput {
    name?: string
    description?: string
    project_type?: ProjectType
    color?: string
    icon?: string
    is_active?: boolean
}

export const PROJECT_TYPE_CONFIGS: Record<ProjectType, { icon: string; color: string; label: string }> = {
    sales: { icon: '💰', color: '#10B981', label: 'Sales' },
    finance: { icon: '🏦', color: '#3B82F6', label: 'Finance' },
    transcripts: { icon: '📝', color: '#8B5CF6', label: 'Transcripts' },
    support: { icon: '🎫', color: '#F59E0B', label: 'Support' },
    operations: { icon: '📦', color: '#EF4444', label: 'Operations' },
    custom: { icon: '📊', color: '#6B7280', label: 'Custom' },
}
