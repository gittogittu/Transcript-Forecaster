'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ProjectDashboardPage() {
    const params = useParams()
    const router = useRouter()
    const projectId = params.id as string

    const [project, setProject] = useState<any>(null)
    const [dataSources, setDataSources] = useState<any[]>([])
    const [predictions, setPredictions] = useState<any[]>([])
    const [predictionSummaries, setPredictionSummaries] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingPredictions, setLoadingPredictions] = useState(false)
    const [selectedSource, setSelectedSource] = useState<string | null>(null)

    useEffect(() => {
        fetchProjectData()
    }, [projectId])

    const fetchProjectData = async () => {
        try {
            // Fetch project details
            const projectRes = await fetch(`/api/projects/${projectId}`)
            const projectData = await projectRes.json()

            // Fetch data sources for this project
            const sourcesRes = await fetch(`/api/clients?project_id=${projectId}`)
            const sourcesData = await sourcesRes.json()

            if (projectData.success) {
                setProject(projectData.project)
            }
            if (sourcesData.success) {
                setDataSources(sourcesData.clients || [])
            }

            // Fetch prediction summaries for this project
            try {
                const summaryRes = await fetch(`/api/predictions/summary?project_id=${projectId}`)
                const summaryData = await summaryRes.json()
                if (summaryData.success) {
                    setPredictionSummaries(summaryData.summaries || [])
                }
            } catch (err) {
                console.error('Error fetching summaries:', err)
            }

            setLoading(false)
        } catch (error) {
            console.error('Error fetching project data:', error)
            setLoading(false)
        }
    }

    const generatePredictions = async (sourceId: string) => {
        setLoadingPredictions(true)
        setSelectedSource(sourceId)
        try {
            const response = await fetch('/api/predictions/simple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: sourceId,
                    horizon: 7,
                    includeConfidence: true
                })
            })
            const data = await response.json()
            if (data.success) {
                setPredictions(data.predictions || [])
            }
        } catch (error) {
            console.error('Error generating predictions:', error)
        }
        setLoadingPredictions(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-gray-600">Loading project...</p>
                </div>
            </div>
        )
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4">❌</div>
                    <p className="text-gray-600 mb-4">Project not found</p>
                    <Link href="/projects" className="text-blue-600 hover:text-blue-700">
                        ← Back to Projects
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white">
            <header
                className="border-b border-gray-200"
                style={{ backgroundColor: `${project.color}10` }}
            >
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <Link href="/projects" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
                        ← Back to Projects
                    </Link>
                    <div className="flex items-center gap-4">
                        <div
                            className="text-5xl w-16 h-16 flex items-center justify-center rounded-xl"
                            style={{ backgroundColor: `${project.color}20` }}
                        >
                            {project.icon}
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
                            {project.description && (
                                <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">Data Sources</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">
                                {project.active_sources || 0}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {project.data_source_count - project.active_sources} inactive
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">Total Records</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">
                                {project.total_records >= 1000
                                    ? `${(project.total_records / 1000).toFixed(1)}K`
                                    : project.total_records || 0}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">All time</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">Project Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold text-gray-900 capitalize">
                                {project.project_type}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Category</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Predictions */}
                {dataSources.length > 0 && (
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">📊 Predictions (7-Day Forecast)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Summary Section */}
                            <div className="mb-8 border-b border-gray-200 pb-8">
                                <h3 className="text-sm font-medium text-gray-700 mb-4">Project Summary</h3>
                                {loading ? (
                                    <div className="text-center py-4">
                                        <p className="text-gray-600">Loading summaries...</p>
                                    </div>
                                ) : predictionSummaries.length > 0 ? (
                                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                                        <table className="w-full border border-gray-200 rounded-lg relative">
                                            <thead className="bg-gray-50 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Client</th>
                                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Total Volume</th>
                                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Confidence</th>
                                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Trend</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {predictionSummaries.map((summary: any) => (
                                                    <tr key={summary.clientId} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                            {summary.clientName}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-900">
                                                            {summary.totalPredictedVolume.toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">
                                                            {summary.confidenceRange.lower.toLocaleString()} - {summary.confidenceRange.upper.toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${summary.trend === 'Up' ? 'bg-green-100 text-green-800' :
                                                                summary.trend === 'Down' ? 'bg-red-100 text-red-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {summary.trend === 'Up' ? '↗ Up' :
                                                                    summary.trend === 'Down' ? '↘ Down' : '→ Stable'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-gray-500">
                                        <p>No active clients to summarize.</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Select a data source for detailed view:
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {dataSources.filter(s => s.is_active).map((source) => (
                                            <button
                                                key={source.id}
                                                onClick={() => generatePredictions(source.id)}
                                                disabled={loadingPredictions}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedSource === source.id
                                                    ? 'text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    } ${loadingPredictions ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                style={{
                                                    backgroundColor: selectedSource === source.id ? project.color : undefined
                                                }}
                                            >
                                                {source.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {loadingPredictions && (
                                    <div className="text-center py-8">
                                        <div className="text-3xl mb-2">🔮</div>
                                        <p className="text-gray-600">Generating predictions...</p>
                                    </div>
                                )}

                                {!loadingPredictions && predictions.length > 0 && (
                                    <div className="mt-6">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                            Predicted Values (Next 7 Days)
                                        </h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full border border-gray-200 rounded-lg">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
                                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Predicted</th>
                                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Range</th>
                                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Trend</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {predictions.map((pred, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                                {new Date(pred.date).toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className="text-sm font-semibold" style={{ color: project.color }}>
                                                                    {Math.round(pred.predicted_value)} units
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                                {Math.round(pred.lower_bound || pred.predicted_value * 0.9)} - {Math.round(pred.upper_bound || pred.predicted_value * 1.1)}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm">
                                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${idx > 0 && pred.predicted_value > predictions[idx - 1].predicted_value
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : idx > 0 && pred.predicted_value < predictions[idx - 1].predicted_value
                                                                        ? 'bg-red-100 text-red-800'
                                                                        : 'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                    {idx > 0 && pred.predicted_value > predictions[idx - 1].predicted_value ? '↗ Up' :
                                                                        idx > 0 && pred.predicted_value < predictions[idx - 1].predicted_value ? '↘ Down' : '→ Stable'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Data Sources Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold">Data Sources</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {dataSources.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-4">📋</div>
                                <p className="text-gray-600 mb-4">No data sources in this project yet</p>
                                <Link
                                    href="/data/import"
                                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Import Data
                                </Link>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Name</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Code</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {dataSources.map((source) => (
                                            <tr key={source.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                    {source.name}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {source.client_code}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${source.is_active
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {source.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {new Date(source.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
