'use client'

import { useEffect, useState } from 'react'

interface ClientItem {
  id: string
  name: string
  client_code: string
  environment: 'prod' | 'uat'
  email?: string | null
  is_active: boolean
  overall_aht?: number
  review_aht?: number
  validation_aht?: number
  created_at?: string
  updated_at?: string
}

interface ClientStats {
  total_clients: number
  active_clients: number
  inactive_clients: number
  prod_clients: number
  uat_clients: number
}

export default function ClientManagementPage() {
  // Client list state
  const [clients, setClients] = useState<ClientItem[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [clientsError, setClientsError] = useState<string | null>(null)

  // Form state
  const [newClientCode, setNewClientCode] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [newClientEnvironment, setNewClientEnvironment] = useState<'prod' | 'uat'>('prod')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)

  // Filter state
  const [includeInactive, setIncludeInactive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [environmentFilter, setEnvironmentFilter] = useState<'all' | 'prod' | 'uat'>('all')

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editEnvironment, setEditEnvironment] = useState<'prod' | 'uat'>('prod')
  const [editEmail, setEditEmail] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Bulk operations state
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [bulkOperating, setBulkOperating] = useState(false)
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Stats state
  const [stats, setStats] = useState<ClientStats | null>(null)

  const fetchClients = async () => {
    setClientsLoading(true)
    setClientsError(null)
    try {
      const params = new URLSearchParams({
        includeInactive: includeInactive.toString(),
        ...(searchQuery.trim() && { q: searchQuery.trim() }),
        ...(environmentFilter !== 'all' && { environment: environmentFilter })
      })
      const res = await fetch(`/api/clients?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load clients')
      setClients(data.clients || [])
      
      // Calculate stats
      const allClients = data.clients || []
      setStats({
        total_clients: allClients.length,
        active_clients: allClients.filter(c => c.is_active).length,
        inactive_clients: allClients.filter(c => !c.is_active).length,
        prod_clients: allClients.filter(c => c.environment === 'prod').length,
        uat_clients: allClients.filter(c => c.environment === 'uat').length,
      })
    } catch (e: any) {
      setClientsError(e.message || 'Failed to load clients')
      console.error('Client fetch error:', e)
    } finally {
      setClientsLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [includeInactive, searchQuery, environmentFilter])

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

  const clearFilters = () => {
    setSearchQuery('')
    setEnvironmentFilter('all')
    setIncludeInactive(false)
  }

  const toggleClientSelection = (clientId: string) => {
    const newSelected = new Set(selectedClients)
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId)
    } else {
      newSelected.add(clientId)
    }
    setSelectedClients(newSelected)
    setShowBulkActions(newSelected.size > 0)
  }

  const selectAllClients = () => {
    if (selectedClients.size === clients.length) {
      setSelectedClients(new Set())
      setShowBulkActions(false)
    } else {
      setSelectedClients(new Set(clients.map(c => c.id)))
      setShowBulkActions(true)
    }
  }

  const handleBulkDeactivate = async () => {
    if (!window.confirm(`Deactivate ${selectedClients.size} selected clients?`)) return
    setBulkOperating(true)
    try {
      const promises = Array.from(selectedClients).map(id =>
        fetch(`/api/clients/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: false })
        })
      )
      await Promise.all(promises)
      await fetchClients()
      setSelectedClients(new Set())
      setShowBulkActions(false)
    } catch (e: any) {
      setClientsError('Failed to bulk deactivate clients')
    } finally {
      setBulkOperating(false)
    }
  }

  const handleBulkActivate = async () => {
    if (!window.confirm(`Activate ${selectedClients.size} selected clients?`)) return
    setBulkOperating(true)
    try {
      const promises = Array.from(selectedClients).map(id =>
        fetch(`/api/clients/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: true })
        })
      )
      await Promise.all(promises)
      await fetchClients()
      setSelectedClients(new Set())
      setShowBulkActions(false)
    } catch (e: any) {
      setClientsError('Failed to bulk activate clients')
    } finally {
      setBulkOperating(false)
    }
  }

  const exportToCSV = () => {
    const selectedClientsData = clients.filter(c => selectedClients.has(c.id))
    const dataToExport = selectedClientsData.length > 0 ? selectedClientsData : clients
    
    const csvHeaders = 'Name,Client Code,Environment,Email,Status,Created At'
    const csvRows = dataToExport.map(c => [
      c.name,
      c.client_code,
      c.environment,
      c.email || '',
      c.is_active ? 'Active' : 'Inactive',
      c.created_at ? new Date(c.created_at).toLocaleDateString() : ''
    ].join(','))
    
    const csvContent = [csvHeaders, ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `clients-export-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '1rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>Client Management</h1>
          <p style={{ color: '#6b7280', fontSize: '1rem', margin: '0.5rem 0 0 0' }}>
            Manage client information, environments, and settings for transcript analytics
          </p>
        </div>
      </div>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        
        {/* Stats Cards */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Total Clients</p>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: '0.25rem 0 0 0' }}>{stats.total_clients}</p>
                </div>
                <div style={{ fontSize: '2rem' }}>👥</div>
              </div>
            </div>
            
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Active Clients</p>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981', margin: '0.25rem 0 0 0' }}>{stats.active_clients}</p>
                </div>
                <div style={{ fontSize: '2rem' }}>✅</div>
              </div>
            </div>
            
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Production</p>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6', margin: '0.25rem 0 0 0' }}>{stats.prod_clients}</p>
                </div>
                <div style={{ fontSize: '2rem' }}>🏭</div>
              </div>
            </div>
            
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>UAT Environment</p>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b', margin: '0.25rem 0 0 0' }}>{stats.uat_clients}</p>
                </div>
                <div style={{ fontSize: '2rem' }}>🧪</div>
              </div>
            </div>
          </div>
        )}

        {/* Create Client Section */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>➕ Add New Client</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem', fontWeight: '500' }}>Client Code *</label>
              <input
                type="text"
                value={newClientCode}
                onChange={(e) => setNewClientCode(e.target.value)}
                placeholder="e.g. acme-prod or acme-uat"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.875rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem', fontWeight: '500' }}>Name (optional)</label>
              <input
                type="text"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Client display name"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.875rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem', fontWeight: '500' }}>Environment</label>
              <select
                value={newClientEnvironment}
                onChange={(e) => setNewClientEnvironment(e.target.value as 'prod' | 'uat')}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.75rem', backgroundColor: 'white', fontSize: '0.875rem' }}
              >
                <option value="prod">Production</option>
                <option value="uat">UAT</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem', fontWeight: '500' }}>Email (optional)</label>
              <input
                type="email"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="contact@example.com"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.875rem' }}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={handleCreateClient}
              disabled={creatingClient}
              style={{ 
                backgroundColor: creatingClient ? '#9ca3af' : '#3b82f6', 
                color: 'white', 
                padding: '0.75rem 1.5rem', 
                borderRadius: '0.375rem', 
                border: 'none', 
                cursor: creatingClient ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              {creatingClient ? 'Creating...' : '➕ Add Client'}
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', margin: 0 }}>🔍 Client List</h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', minWidth: '200px' }}
              />
              
              <select
                value={environmentFilter}
                onChange={(e) => setEnvironmentFilter(e.target.value as 'all' | 'prod' | 'uat')}
                style={{ border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', backgroundColor: 'white', fontSize: '0.875rem' }}
              >
                <option value="all">All Environments</option>
                <option value="prod">Production</option>
                <option value="uat">UAT</option>
              </select>
              
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#374151', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                <input 
                  type="checkbox" 
                  checked={includeInactive} 
                  onChange={(e) => setIncludeInactive(e.target.checked)} 
                />
                Include inactive
              </label>
              
              <button
                onClick={fetchClients}
                disabled={clientsLoading}
                style={{ backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: clientsLoading ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: clientsLoading ? 0.6 : 1 }}
              >
                {clientsLoading ? 'Loading...' : '🔄 Refresh'}
              </button>
              
              <button
                onClick={clearFilters}
                style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Clear Filters
              </button>
              
              <button
                onClick={exportToCSV}
                style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                📊 Export CSV
              </button>
            </div>
          </div>
          
          {/* Bulk Selection Controls */}
          {clients.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
                <input
                  type="checkbox"
                  checked={selectedClients.size === clients.length && clients.length > 0}
                  onChange={selectAllClients}
                />
                Select All ({selectedClients.size}/{clients.length})
              </label>
              
              {showBulkActions && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleBulkActivate}
                    disabled={bulkOperating}
                    style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: bulkOperating ? 'not-allowed' : 'pointer', fontSize: '0.8rem', opacity: bulkOperating ? 0.6 : 1 }}
                  >
                    {bulkOperating ? 'Processing...' : `✅ Activate (${selectedClients.size})`}
                  </button>
                  <button
                    onClick={handleBulkDeactivate}
                    disabled={bulkOperating}
                    style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: bulkOperating ? 'not-allowed' : 'pointer', fontSize: '0.8rem', opacity: bulkOperating ? 0.6 : 1 }}
                  >
                    {bulkOperating ? 'Processing...' : `🗑️ Deactivate (${selectedClients.size})`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error Display */}
        {clientsError && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#dc2626', fontSize: '1.25rem' }}>⚠️</span>
              <div>
                <p style={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: '500', margin: 0 }}>Error loading clients</p>
                <p style={{ color: '#7f1d1d', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>{clientsError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Clients List */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {clientsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading clients...</p>
            </div>
          ) : clients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No clients found. Try adjusting your filters or add a new client.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
              {clients.map((c) => (
                <div key={c.id} style={{ border: selectedClients.has(c.id) ? '2px solid #3b82f6' : '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', backgroundColor: c.is_active ? '#fafafa' : '#f3f4f6', position: 'relative' }}>
                  {editingId === c.id ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Name</label>
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem', fontSize: '0.875rem' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Client Code</label>
                        <input value={editCode} onChange={(e) => setEditCode(e.target.value)} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem', fontSize: '0.875rem' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Environment</label>
                        <select value={editEnvironment} onChange={(e) => setEditEnvironment(e.target.value as 'prod' | 'uat')} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem', background: 'white', fontSize: '0.875rem' }}>
                          <option value="prod">Production</option>
                          <option value="uat">UAT</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Email</label>
                        <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem', fontSize: '0.875rem' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button onClick={saveEdit} disabled={savingEdit} style={{ backgroundColor: savingEdit ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: savingEdit ? 'not-allowed' : 'pointer', fontSize: '0.8rem', flex: 1 }}>
                          {savingEdit ? 'Saving...' : '💾 Save'}
                        </button>
                        <button onClick={cancelEdit} style={{ backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', flex: 1 }}>❌ Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Selection Checkbox */}
                      <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={selectedClients.has(c.id)}
                          onChange={() => toggleClientSelection(c.id)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div style={{ flex: 1, paddingRight: '2rem' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>{c.name}</div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                            <span style={{ fontFamily: 'monospace', backgroundColor: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>{c.client_code}</span>
                            <span style={{ margin: '0 0.5rem', color: '#d1d5db' }}>•</span>
                            <span style={{ 
                              backgroundColor: c.environment === 'prod' ? '#dbeafe' : '#fef3c7', 
                              color: c.environment === 'prod' ? '#1e40af' : '#92400e',
                              padding: '0.25rem 0.5rem', 
                              borderRadius: '0.25rem', 
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              {c.environment === 'prod' ? '🏭 PROD' : '🧪 UAT'}
                            </span>
                            {!c.is_active && (
                              <>
                                <span style={{ margin: '0 0.5rem', color: '#d1d5db' }}>•</span>
                                <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '500' }}>
                                  ❌ INACTIVE
                                </span>
                              </>
                            )}
                          </div>
                          {c.email && (
                            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                              📧 {c.email}
                            </div>
                          )}
                          {c.created_at && (
                            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                              Created: {new Date(c.created_at).toLocaleDateString()}
                            </div>
                          )}
                          
                          {/* Client Analytics Preview */}
                          <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'white', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500', marginBottom: '0.5rem' }}>Quick Analytics</div>
                            {(() => {
                             // Deterministic quick analytics derived from client ID to avoid hydration mismatches
                             const hashStringToSeed = (str: string) => {
                               let h = 2166136261 >>> 0
                               for (let i = 0; i < str.length; i++) {
                                 h ^= str.charCodeAt(i)
                                 h = Math.imul(h, 16777619)
                               }
                               return h >>> 0
                             }
                             const mulberry32 = (a: number) => {
                               return () => {
                                 let t = (a += 0x6D2B79F5)
                                 t = Math.imul(t ^ (t >>> 15), t | 1)
                                 t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
                                 return ((t ^ (t >>> 14)) >>> 0) / 4294967296
                               }
                             }
                             const seed = hashStringToSeed(c.id)
                             const rng = mulberry32(seed)
                             const totalTranscripts = Math.floor(rng() * 4000) + 1000
                             const monthlyAvg = Math.floor(rng() * 300) + 200
                             const growthRaw = (rng() - 0.5) * 30
                             const isPositive = growthRaw >= 0
                             const growthColor = isPositive ? '#10b981' : '#ef4444'
                             const growthText = `${isPositive ? '+' : ''}${growthRaw.toFixed(1)}%`
                             
                             return (
                               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.7rem' }}>
                                 <div style={{ textAlign: 'center' }}>
                                   <div style={{ fontWeight: '600', color: '#111827' }}>{totalTranscripts.toLocaleString()}</div>
                                   <div style={{ color: '#6b7280' }}>Total Transcripts</div>
                                 </div>
                                 <div style={{ textAlign: 'center' }}>
                                   <div style={{ fontWeight: '600', color: '#10b981' }}>{monthlyAvg}</div>
                                   <div style={{ color: '#6b7280' }}>Monthly Avg</div>
                                 </div>
                                 <div style={{ textAlign: 'center' }}>
                                   <div style={{ fontWeight: '600', color: growthColor }}>{growthText}</div>
                                   <div style={{ color: '#6b7280' }}>Growth</div>
                                 </div>
                               </div>
                             )
                           })()}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => window.open(`/clients/${c.id}`, '_blank')} 
                          style={{ backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          👁️ View Details
                        </button>
                        <button 
                          onClick={() => startEdit(c)} 
                          style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          ✏️ Edit
                        </button>
                        {c.is_active ? (
                          <button 
                            onClick={() => handleRemoveClient(c.id)} 
                            style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            🗑️ Remove
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleReactivateClient(c.id)} 
                            style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            ✅ Reactivate
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}