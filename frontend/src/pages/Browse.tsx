import React, { useEffect, useState } from 'react'
import axios from 'axios'
import DataTable from '../components/DataTable'
import '../styles/Browse.css'

const apiBaseUrl = (window as any).APP_CONFIG?.API_BASE_URL || 'http://localhost:5000'

interface Transaction {
  _id: string
  customer_id: string
  tolltime: string
  tollstatus: string
  toll_point_name: string
  toll_amount: number
  timezone: string
  state: string
  connection_status: boolean
}

function BrowseScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const [filters, setFilters] = useState({
    customer_id: '',
    status: '',
    page: 1,
    limit: 10000,
  })

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (filters.customer_id) params.append('customer_id', filters.customer_id)
      if (filters.status) params.append('status', filters.status)
      params.append('page', filters.page.toString())
      params.append('limit', filters.limit.toString())

      const response = await axios.get(
        `${apiBaseUrl}/api/transactions?${params}`
      )

      setTransactions(response.data.data)
      setError('')
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transactions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [filters])

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1,
    }))
  }

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.customer_id) params.append('customer_id', filters.customer_id)

      window.location.href = `${apiBaseUrl}/api/transactions/export/csv?${params}`
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setError('')
      setImportSuccess('')

      const fileReader = new FileReader()
      fileReader.onload = async (event) => {
        try {
          const csvData = event.target?.result as string
          
          const response = await axios.post(
            `${apiBaseUrl}/api/transactions/import/csv`,
            { csvData }
          )

          setImportSuccess(`✅ ${response.data.message} (${response.data.data.importedCount} imported)`)
          
          // Refresh the data
          setTimeout(() => {
            fetchTransactions()
            setImportSuccess('')
          }, 2000)
        } catch (err: any) {
          setError(err.response?.data?.message || 'Import failed')
        }
      }

      fileReader.readAsText(file)
    } catch (err) {
      console.error('File read failed:', err)
      setError('Failed to read file')
    }
  }

  return (
    <div className="browse-screen">
      <div className="browse-header">
        <h2>📊 Browse Tolling Transactions</h2>
        <p>View and manage tolling transaction data from MongoDB</p>
      </div>

      <div className="filters">
        <input
          type="text"
          name="customer_id"
          placeholder="Filter by Customer ID"
          value={filters.customer_id}
          onChange={handleFilterChange}
        />
        <select name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        
        <div className="action-buttons">
          <button onClick={handleExportCSV} className="btn-export">
            📥 Export CSV
          </button>
          
          <label className="btn-import">
            📤 Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {loading && <p className="loading">Loading transactions...</p>}
      {error && <p className="error">❌ {error}</p>}
      {importSuccess && <p className="success">{importSuccess}</p>}

      {!loading && transactions.length === 0 && (
        <p className="no-data">No transactions found</p>
      )}

      {!loading && transactions.length > 0 && (
        <DataTable transactions={transactions} />
      )}

      <div className="pagination">
        <button
          onClick={() =>
            setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
          }
          disabled={filters.page === 1}
        >
          ← Previous
        </button>
        <span>Page {filters.page}</span>
        <button
          onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
        >
          Next →
        </button>
      </div>
    </div>
  )
}

export default BrowseScreen
