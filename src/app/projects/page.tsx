'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PROJECT_TYPE_CONFIGS, ProjectWithStats } from '@/types/project'
import Link from 'next/link'

export default function ProjectsPage() {
    const [projects, setProjects] = useState<ProjectWithStats[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchProjects()
    }, [])

    const fetchProjects = async () => {
        try {
            const response = await fetch('/api/projects?include_stats=true')
            const data = await response.json()
            if (data.success) {
                setProjects(data.projects)
            }
            setLoading(false)
        } catch (error) {
            console.error('Error fetching projects:', error)
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-gray-600">Loading projects...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white">
            <header className="border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
                        <p className="text-sm text-gray-600 mt-1">Organize your data sources by purpose</p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href="/data/import"
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                            📥 Import Data
                        </Link>
                        <Link
                            href="/projects/new"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            + New Project
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {projects.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">📁</div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h2>
                        <p className="text-gray-600 mb-6">Create your first project to organize your data sources</p>
                        <Link
                            href="/projects/new"
                            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Create Project
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <Card key={project.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="text-4xl w-14 h-14 flex items-center justify-center rounded-lg"
                                                style={{ backgroundColor: `${project.color}20` }}
                                            >
                                                {project.icon}
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg font-semibold">{project.name}</CardTitle>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {PROJECT_TYPE_CONFIGS[project.project_type]?.label || project.project_type}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {project.description && (
                                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                                    )}

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <div className="text-2xl font-bold text-gray-900">{project.data_source_count}</div>
                                            <div className="text-xs text-gray-500">Data Sources</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-gray-900">
                                                {project.total_records >= 1000
                                                    ? `${(project.total_records / 1000).toFixed(1)}K`
                                                    : project.total_records}
                                            </div>
                                            <div className="text-xs text-gray-500">Total Records</div>
                                        </div>
                                    </div>

                                    <Link
                                        href={`/projects/${project.id}/dashboard`}
                                        className="block w-full text-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-900"
                                    >
                                        View Dashboard
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
