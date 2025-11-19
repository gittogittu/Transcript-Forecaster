'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
    const [clients, setClients] = useState<any[]>([])
    const [analytics, setAnalytics] = useState<any>(null)
    const [predictions, setPredictions] = useState<any[]>([])
    const [predictionSummaries, setPredictionSummaries] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingPredictions, setLoadingPredictions] = useState(false)
    const [selectedClient, setSelectedClient] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const clientsRes = await fetch('/api/clients')
            const clientsData = await clientsRes.json()

            const analyticsRes = await fetch('/api/analytics/comprehensive-data')
            const analyticsData = await analyticsRes.json()

            setClients(clientsData.clients || [])
            setAnalytics(analyticsData.data || null)

            // Fetch prediction summaries
            try {
                const summaryRes = await fetch('/api/predictions/summary')
                const summaryData = await summaryRes.json()
                if (summaryData.success) {
                    setPredictionSummaries(summaryData.summaries || [])
                }
            } catch (err) {
                console.error('Error fetching summaries:', err)
            }

            setLoading(false)
        } catch (error) {
            console.error('Error fetching data:', error)
            setLoading(false)
        }
    }

    const generatePredictions = async (clientId: string) => {
        setLoadingPredictions(true)
        setSelectedClient(clientId)
        try {
            const response = await fetch('/api/predictions/simple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId,
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
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white">
            <header className="border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            {new Date().toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                    <a
                        href="/"
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        ← Back to Home
                    </a>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">Data Sources</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">
                                {clients.filter(c => c.is_active).length}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {clients.filter(c => !c.is_active).length} inactive
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">Total Records</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">
                                {analytics?.overview?.total_transcripts?.toLocaleString() || '0'}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">All time</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">Avg Growth</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">
                                {analytics?.overview?.avg_monthly_growth
                                    ? `+${(analytics.overview.avg_monthly_growth * 100).toFixed(1)}%`
                                    : '0%'}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Monthly</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">Production Sources</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600">
                                {clients.filter(c => c.environment === 'prod' && c.is_active).length}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {clients.filter(c => c.environment === 'uat' && c.is_active).length} UAT
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Prediction Summary Section */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold">📈 Client Prediction Summary (Next 7 Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="text-3xl mb-2">⏳</div>
                                <p className="text-gray-600">Loading summaries...</p>
                            </div>
                        ) : predictionSummaries.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full border border-gray-200 rounded-lg">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Client</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Total Predicted Volume</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Confidence Range</th>
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
                            <div className="text-center py-8 text-gray-500">
                                <p>No active clients to summarize.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {clients.length > 0 && (
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">📊 ML Predictions (7-Day Forecast)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Select a data source to view predictions:
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {clients.filter(c => c.is_active).map((client) => (
                                            <button
                                                key={client.id}
                                                onClick={() => generatePredictions(client.id)}
                                                disabled={loadingPredictions}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedClient === client.id
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    } ${loadingPredictions ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {client.name}
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
                                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Confidence Range</th>
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
                                                                <span className="text-sm font-semibold text-blue-600">
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
                                        <p className="text-xs text-gray-500 mt-3">
                                            💡 Predictions are based on ML analysis of historical data patterns
                                        </p>
                                    </div>
                                )}

                                {!loadingPredictions && predictions.length === 0 && selectedClient && (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>No predictions available. Try importing data first.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold">Data Sources</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {clients.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-4">📋</div>
                                <p className="text-gray-600 mb-4">No data sources yet</p>
                                <a
                                    href="/data/import"
                                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Import Data
                                </a>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Source Name</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Source Code</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Environment</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {clients.map((client) => (
                                            <tr key={client.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                    {client.name}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {client.client_code}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${client.environment === 'prod'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {client.environment.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${client.is_active
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {client.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {new Date(client.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a
                        href="/data/import"
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                    >
                        <div className="text-2xl mb-2">📤</div>
                        <p className="text-sm font-medium text-gray-900">Import New Data</p>
                    </a>
                    <a
                        href="/clients"
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                    >
                        <div className="text-2xl mb-2">🏢</div>
                        <p className="text-sm font-medium text-gray-900">Manage Data Sources</p>
                    </a>
                    <button
                        onClick={fetchData}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                    >
                        <div className="text-2xl mb-2">🔄</div>
                        <p className="text-sm font-medium text-gray-900">Refresh Data</p>
                    </button>
                </div>
            </main>
        </div>
    )
}
