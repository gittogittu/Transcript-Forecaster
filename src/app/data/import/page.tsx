'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  name: string
  icon: string
  color: string
}

interface ClientItem {
  id: string
  name: string
  client_code: string
  project_id?: string
}

export default function DataImportPage() {
  const router = useRouter()

  // State
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<ClientItem[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)

  // Selection State
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')

  // New Client State
  const [isCreatingClient, setIsCreatingClient] = useState(false)
  const [newClientCode, setNewClientCode] = useState('')
  const [newClientName, setNewClientName] = useState('')

  // Upload State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)

  // Fetch Projects on Load
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects')
        const data = await res.json()
        if (data.success) {
          setProjects(data.projects)
          // Auto-select first project if available
          if (data.projects.length > 0) {
            setSelectedProjectId(data.projects[0].id)
          }
        }
      } catch (e) {
        console.error('Error fetching projects:', e)
      } finally {
        setLoadingProjects(false)
      }
    }
    fetchProjects()
  }, [])

  // Fetch Clients when Project Changes
  useEffect(() => {
    if (!selectedProjectId) {
      setClients([])
      return
    }

    const fetchClients = async () => {
      try {
        const res = await fetch(`/api/clients?project_id=${selectedProjectId}`)
        const data = await res.json()
        if (data.success) {
          setClients(data.clients || [])
          setSelectedClientId('') // Reset client selection
        }
      } catch (e) {
        console.error('Error fetching clients:', e)
      }
    }
    fetchClients()
  }, [selectedProjectId])

  // Handle File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files))
    }
  }

  // Handle Create Client
  const handleCreateClient = async () => {
    if (!newClientCode.trim()) return

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_code: newClientCode,
          name: newClientName || undefined,
          project_id: selectedProjectId,
          environment: 'prod'
        })
      })
      const data = await res.json()
      if (data.success) {
        setClients([...clients, data.client])
        setSelectedClientId(data.client.id)
        setIsCreatingClient(false)
        setNewClientCode('')
        setNewClientName('')
      }
    } catch (e) {
      console.error('Error creating client:', e)
      alert('Failed to create data source')
    }
  }

  // Handle Upload
  const handleUpload = async () => {
    if (!selectedFiles.length || !selectedClientId) return

    setIsUploading(true)
    setUploadStatus('Uploading...')
    setUploadProgress(0)

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('clientId', selectedClientId) // Important: Associate with Client
        formData.append('project_id', selectedProjectId) // Redundant but good for tracking

        const res = await fetch('/api/data/import', {
          method: 'POST',
          body: formData
        })

        if (!res.ok) throw new Error('Upload failed')

        setUploadProgress(((i + 1) / selectedFiles.length) * 100)
      }
      setUploadStatus('✅ Upload Complete!')
      setTimeout(() => {
        setUploadStatus('')
        setSelectedFiles([])
        // Redirect to dashboard after success
        router.push(`/projects/${selectedProjectId}/dashboard`)
      }, 1500)
    } catch (e) {
      setUploadStatus('❌ Upload Failed')
      console.error(e)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">📥 Import Data</h1>
            <p className="text-sm text-gray-500">Add data to your projects</p>
          </div>
          <Link href="/projects" className="text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Step 1: Select Project */}
          <div className="p-6 border-b border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. Select Project
            </label>
            {loadingProjects ? (
              <div className="text-gray-500 text-sm">Loading projects...</div>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="" disabled>Choose a project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Step 2: Select Data Source */}
          <div className={`p-6 border-b border-gray-100 transition-opacity ${!selectedProjectId ? 'opacity-50 pointer-events-none' : ''}`}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2. Select Data Source
            </label>

            {!isCreatingClient ? (
              <div className="flex gap-3">
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a data source...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.client_code})</option>
                  ))}
                </select>
                <button
                  onClick={() => setIsCreatingClient(true)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  + New Source
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Create New Data Source</h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Source Code (Required)</label>
                    <input
                      type="text"
                      placeholder="e.g. sales-q1-2024"
                      value={newClientCode}
                      onChange={(e) => setNewClientCode(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Display Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Q1 Sales Data"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateClient}
                    disabled={!newClientCode}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50"
                  >
                    Create & Select
                  </button>
                  <button
                    onClick={() => setIsCreatingClient(false)}
                    className="px-3 py-1.5 text-gray-600 hover:text-gray-900 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Upload Files */}
          <div className={`p-6 transition-opacity ${!selectedClientId ? 'opacity-50 pointer-events-none' : ''}`}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              3. Upload Files
            </label>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors relative">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="text-4xl mb-2">📄</div>
              <p className="text-sm text-gray-600 font-medium">
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} file(s) selected`
                  : 'Click or drag files here'}
              </p>
              <p className="text-xs text-gray-400 mt-1">CSV, Excel, JSON supported</p>
            </div>

            {/* File List */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                    <span className="text-gray-700 truncate">{f.name}</span>
                    <span className="text-gray-400 text-xs">{(f.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            <div className="mt-6">
              <button
                onClick={handleUpload}
                disabled={isUploading || selectedFiles.length === 0}
                className={`w-full py-3 rounded-lg font-medium text-white transition-all ${isUploading || selectedFiles.length === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg'
                  }`}
              >
                {isUploading ? `Uploading... ${uploadProgress.toFixed(0)}%` : 'Start Import'}
              </button>
              {uploadStatus && (
                <p className={`text-center text-sm mt-3 font-medium ${uploadStatus.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
                  {uploadStatus}
                </p>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
