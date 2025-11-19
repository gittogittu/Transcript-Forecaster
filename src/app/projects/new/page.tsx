'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PROJECT_TYPE_CONFIGS, ProjectType } from '@/types/project'
import { useRouter } from 'next/navigation'

export default function NewProjectPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        project_type: 'custom' as ProjectType,
        color: '#3B82F6',
        icon: '📊',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            const data = await response.json()

            if (data.success) {
                router.push('/projects')
            } else {
                setError(data.error || 'Failed to create project')
            }
        } catch (err) {
            setError('An error occurred while creating the project')
        } finally {
            setLoading(false)
        }
    }

    const handleTypeChange = (type: ProjectType) => {
        const config = PROJECT_TYPE_CONFIGS[type]
        setFormData({
            ...formData,
            project_type: type,
            icon: config.icon,
            color: config.color,
        })
    }

    return (
        <div className="min-h-screen bg-white">
            <header className="border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <h1 className="text-2xl font-semibold text-gray-900">Create New Project</h1>
                    <p className="text-sm text-gray-600 mt-1">Set up a new project to organize your data sources</p>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Project Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Project Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., Sales Analytics, Finance Tracking"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Describe the purpose of this project..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Project Type *
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {(Object.keys(PROJECT_TYPE_CONFIGS) as ProjectType[]).map((type) => {
                                        const config = PROJECT_TYPE_CONFIGS[type]
                                        const isSelected = formData.project_type === type
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => handleTypeChange(type)}
                                                className={`p-4 border-2 rounded-lg transition-all ${isSelected
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="text-3xl mb-2">{config.icon}</div>
                                                <div className="text-sm font-medium text-gray-900">{config.label}</div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Icon
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={formData.icon}
                                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="📊"
                                        />
                                        <div className="w-12 h-12 border border-gray-300 rounded-lg flex items-center justify-center text-2xl">
                                            {formData.icon}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Enter an emoji or icon</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Color
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="#3B82F6"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Hex color code</p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Creating...' : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
