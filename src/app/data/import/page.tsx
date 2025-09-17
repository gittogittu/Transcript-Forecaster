'use client'

import { useEffect, useState } from 'react'
interface ClientItem {
  id: string
  name: string
  client_code: string
  environment: 'prod' | 'uat'
  email?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export default function DataImportPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [processingOptions, setProcessingOptions] = useState({
    cleanData: true,
    generateEmbeddings: true,
    trainModels: false,
    detectAnomalies: false
  })

  // Clients state
  const [clients, setClients] = useState<ClientItem[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [clientsError, setClientsError] = useState<string | null>(null)

  const [newClientCode, setNewClientCode] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [newClientEnvironment, setNewClientEnvironment] = useState<'prod' | 'uat'>('prod')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)

  // Edit client state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editEnvironment, setEditEnvironment] = useState<'prod' | 'uat'>('prod')
  const [editEmail, setEditEmail] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const startEdit = (c: ClientItem) => {
    setEditingId(c.id)
    setEditName(c.name)
    setEditCode(c.client_code)
    setEditEnvironment(c.environment)
    setEditEmail(c.email || '')
  }


  const cancelEdit = () => {
    setEditingId(null)
    setClientsError(null)
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSavingEdit(true)
    setClientsError(null)
    try {
      const res = await fetch(`/api/clients/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          client_code: editCode.trim(),
          environment: editEnvironment,
          email: editEmail.trim() || null,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update client')
      setClients(prev => prev.map(c => c.id === editingId ? data.client : c))
      setEditingId(null)
    } catch (e: any) {
      setClientsError(e.message || 'Failed to update client')
    } finally {
      setSavingEdit(false)
    }
  }

  const [includeInactive, setIncludeInactive] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchClients = async () => {
    setClientsLoading(true)
    setClientsError(null)
    try {
      const params = new URLSearchParams({
        includeInactive: includeInactive.toString(),
        ...(searchQuery.trim() && { q: searchQuery.trim() })
      })
      const res = await fetch(`/api/clients?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load clients')
      setClients(data.clients || [])
    } catch (e: any) {
      setClientsError(e.message || 'Failed to load clients')
      console.error('Client fetch error:', e)
    } finally {
      setClientsLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [includeInactive, searchQuery])

  const handleCreateClient = async () => {
    if (!newClientCode.trim()) {
      setClientsError('Client code is required')
      return
    }
    setCreatingClient(true)
    setClientsError(null)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_code: newClientCode.trim(),
          name: newClientName.trim() || undefined,
          environment: newClientEnvironment,
          email: newClientEmail.trim() || undefined,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create client')
      setClients(prev => [data.client, ...prev])
      setNewClientCode('')
      setNewClientName('')
      setNewClientEmail('')
      setNewClientEnvironment('prod')
    } catch (e: any) {
      setClientsError(e.message || 'Failed to create client')
    } finally {
      setCreatingClient(false)
    }
  }

  const handleRemoveClient = async (id: string) => {
    const confirm = window.confirm('Are you sure you want to remove this client? This will deactivate the client but not delete historical data.')
    if (!confirm) return
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove client')
      setClients(prev => prev.filter(c => c.id !== id))
    } catch (e: any) {
      setClientsError(e.message || 'Failed to remove client')
    }
  }

  const handleReactivateClient = async (id: string) => {
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reactivate client')
      setClients(prev => prev.map(c => c.id === id ? data.client : c))
    } catch (e: any) {
      setClientsError(e.message || 'Failed to reactivate client')
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(files)
    setUploadStatus('')
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files)
    setSelectedFiles(files)
    setUploadStatus('')
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadStatus('Please select files to upload')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus('Uploading...')

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('cleanData', processingOptions.cleanData.toString())
        formData.append('generateEmbeddings', processingOptions.generateEmbeddings.toString())
        formData.append('trainModels', processingOptions.trainModels.toString())
        formData.append('detectAnomalies', processingOptions.detectAnomalies.toString())

        const response = await fetch('/api/data/import', {
          method: 'POST',
          body: formData
        })

        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Upload failed')
        }

        setUploadProgress(((i + 1) / selectedFiles.length) * 100)
      }

      setUploadStatus('Upload completed successfully!')
      setSelectedFiles([])
    } catch (error) {
      setUploadStatus(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleOptionChange = (option: keyof typeof processingOptions) => {
    setProcessingOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }))
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '1rem 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                📊 Data Import Center
              </h1>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                Upload and manage historical data for training and analysis
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>← Back to Home</a>
              <a href="/analytics/dashboard" style={{ backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', textDecoration: 'none', fontSize: '0.875rem' }}>
                View Analytics
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        
        {/* Client Management */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>👥 Client Management</h2>

          {/* Create client form */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem' }}>Client Code</label>
              <input
                type="text"
                value={newClientCode}
                onChange={(e) => setNewClientCode(e.target.value)}
                placeholder="e.g. acme-prod or acme-uat"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem' }}>Name (optional)</label>
              <input
                type="text"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Client display name"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem' }}>Environment</label>
              <select
                value={newClientEnvironment}
                onChange={(e) => setNewClientEnvironment(e.target.value as 'prod' | 'uat')}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem', backgroundColor: 'white' }}
              >
                <option value="prod">prod</option>
                <option value="uat">uat</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem' }}>Email (optional)</label>
              <input
                type="email"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="contact@example.com"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <button
              onClick={handleCreateClient}
              disabled={creatingClient}
              style={{ backgroundColor: creatingClient ? '#9ca3af' : '#2563eb', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: creatingClient ? 'not-allowed' : 'pointer' }}
            >
              {creatingClient ? 'Creating...' : 'Add Client'}
            </button>
            {clientsError && (
              <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>{clientsError}</span>
            )}
          </div>

          {/* Clients list */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 500, margin: 0, color: '#111827' }}>Existing Clients</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.4rem 0.75rem', fontSize: '0.875rem', minWidth: '180px' }}
                />
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#374151', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
                  Include inactive
                </label>
                <button
                  onClick={fetchClients}
                  disabled={clientsLoading}
                  style={{ backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.4rem 0.75rem', cursor: clientsLoading ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: clientsLoading ? 0.6 : 1 }}
                >
                  {clientsLoading ? 'Loading...' : '🔄 Refresh'}
                </button>
              </div>
            </div>
            {clientsError && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', padding: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#dc2626', fontSize: '1rem' }}>⚠️</span>
                  <div>
                    <p style={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: '500', margin: 0 }}>Error loading clients</p>
                    <p style={{ color: '#7f1d1d', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>{clientsError}</p>
                  </div>
                </div>
              </div>
            )}
            {clientsLoading ? (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading clients...</p>
            ) : clients.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No clients found.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                {clients.map((c) => (
                  <div key={c.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.75rem', backgroundColor: '#fafafa' }}>
                    {editingId === c.id ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', alignItems: 'center' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280' }}>Name</label>
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.4rem' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280' }}>Client Code</label>
                          <input value={editCode} onChange={(e) => setEditCode(e.target.value)} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.4rem' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280' }}>Environment</label>
                          <select value={editEnvironment} onChange={(e) => setEditEnvironment(e.target.value as 'prod' | 'uat')} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.4rem', background: 'white' }}>
                            <option value="prod">prod</option>
                            <option value="uat">uat</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280' }}>Email</label>
                          <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.4rem' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                          <button onClick={saveEdit} disabled={savingEdit} style={{ backgroundColor: savingEdit ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.4rem 0.6rem', cursor: savingEdit ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}>Save</button>
                          <button onClick={cancelEdit} style={{ backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.4rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>{c.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{c.client_code} · {c.environment}{!c.is_active ? ' · inactive' : ''}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button onClick={() => startEdit(c)} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.35rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
                          {c.is_active ? (
                            <button onClick={() => handleRemoveClient(c.id)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.35rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem' }}>Remove</button>
                          ) : (
                            <button onClick={() => handleReactivateClient(c.id)} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.35rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem' }}>Reactivate</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upload Section */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>📤 Upload Historical Data</h2>
          
          {/* File Upload Area */}
          <div 
            style={{ 
              border: '2px dashed #d1d5db', 
              borderRadius: '0.5rem', 
              padding: '3rem', 
              textAlign: 'center', 
              backgroundColor: '#f9fafb',
              marginBottom: '1.5rem'
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '500', color: '#111827', marginBottom: '0.5rem' }}>
              Drop files here or click to browse
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Supports CSV, JSON, Excel files up to 50MB
            </p>
            <input 
              type="file" 
              multiple 
              accept=".csv,.json,.xlsx,.xls"
              style={{ display: 'none' }}
              id="file-upload"
              onChange={handleFileSelect}
            />
            <label 
              htmlFor="file-upload"
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                border: 'none',
                display: 'inline-block'
              }}
            >
              Choose Files
            </label>
          </div>

          {/* Selected Files Display */}
          {selectedFiles.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '500', color: '#111827', marginBottom: '0.5rem' }}>
                Selected Files ({selectedFiles.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedFiles.map((file, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '0.5rem',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '0.375rem'
                  }}>
                    <span style={{ fontSize: '0.875rem' }}>
                      📄 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                    <button
                      onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                      style={{
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button and Status */}
          {selectedFiles.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                style={{
                  backgroundColor: isUploading ? '#9ca3af' : '#10b981',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  marginRight: '1rem'
                }}
              >
                {isUploading ? 'Uploading...' : 'Upload Files'}
              </button>
              
              {isUploading && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ 
                    width: '100%', 
                    backgroundColor: '#e5e7eb', 
                    borderRadius: '0.5rem', 
                    height: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ 
                      width: `${uploadProgress}%`, 
                      backgroundColor: '#10b981', 
                      height: '100%', 
                      borderRadius: '0.5rem',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {uploadProgress.toFixed(0)}% complete
                  </p>
                </div>
              )}
              
              {uploadStatus && (
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: uploadStatus.includes('failed') ? '#ef4444' : '#10b981',
                  marginTop: '0.5rem'
                }}>
                  {uploadStatus}
                </p>
              )}
            </div>
          )}

          {/* Data Format Examples */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '1rem' }}>
              <h4 style={{ fontWeight: '500', marginBottom: '0.5rem', color: '#111827' }}>📈 Time Series Data</h4>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Expected columns: date, value, client_id (optional)
              </p>
              <code style={{ fontSize: '0.75rem', backgroundColor: '#f3f4f6', padding: '0.25rem', borderRadius: '0.25rem', display: 'block' }}>
                date,value,client_id<br/>
                2024-01-01,45,client-1<br/>
                2024-01-02,52,client-1
              </code>
            </div>
            
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '1rem' }}>
              <h4 style={{ fontWeight: '500', marginBottom: '0.5rem', color: '#111827' }}>📋 Transcript Data</h4>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Expected columns: date, transcript_count, client_name
              </p>
              <code style={{ fontSize: '0.75rem', backgroundColor: '#f3f4f6', padding: '0.25rem', borderRadius: '0.25rem', display: 'block' }}>
                date,transcript_count,client_name<br/>
                2024-01-01,25,Acme Corp<br/>
                2024-01-02,30,Acme Corp
              </code>
            </div>
          </div>
        </div>

        {/* Data Processing Options */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>⚙️ Processing Options</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  checked={processingOptions.cleanData}
                  onChange={() => handleOptionChange('cleanData')}
                  style={{ marginRight: '0.5rem' }} 
                />
                <span style={{ fontWeight: '500' }}>🧹 Clean Data</span>
              </label>
              <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Remove duplicates, handle missing values, and validate data types
              </p>
            </div>
            
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  checked={processingOptions.generateEmbeddings}
                  onChange={() => handleOptionChange('generateEmbeddings')}
                  style={{ marginRight: '0.5rem' }} 
                />
                <span style={{ fontWeight: '500' }}>🔍 Generate Embeddings</span>
              </label>
              <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Create vector embeddings for similarity search and pattern matching
              </p>
            </div>
            
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  checked={processingOptions.trainModels}
                  onChange={() => handleOptionChange('trainModels')}
                  style={{ marginRight: '0.5rem' }} 
                />
                <span style={{ fontWeight: '500' }}>🤖 Train Models</span>
              </label>
              <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Automatically train forecasting models with the imported data
              </p>
            </div>
            
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  checked={processingOptions.detectAnomalies}
                  onChange={() => handleOptionChange('detectAnomalies')}
                  style={{ marginRight: '0.5rem' }} 
                />
                <span style={{ fontWeight: '500' }}>🚨 Detect Anomalies</span>
              </label>
              <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Run anomaly detection on historical data to identify patterns
              </p>
            </div>
          </div>
        </div>

        {/* Import History */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>📚 Import History</h2>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>File Name</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>Import Date</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>Records</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>sample_data.csv</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>2024-01-15 14:30</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>1,247</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                      ✅ Completed
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button style={{ color: '#3b82f6', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
                      View Details
                    </button>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>historical_transcripts.xlsx</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>2024-01-14 09:15</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>3,892</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                      ⏳ Processing
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button style={{ color: '#3b82f6', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
                      View Progress
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>🚀 Quick Actions</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <button style={{
              padding: '1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              📥 Import Sample Data
            </button>
            
            <button style={{
              padding: '1rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              📊 View Data Summary
            </button>
            
            <button style={{
              padding: '1rem',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              🔄 Sync External Data
            </button>
            
            <button style={{
              padding: '1rem',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              📋 Download Template
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

