'use client'

import { useState } from 'react'

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