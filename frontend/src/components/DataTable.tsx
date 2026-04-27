import React, { useState, useMemo } from 'react'
import '../styles/DataTable.css'

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

interface DataTableProps {
  transactions: Transaction[]
}

type SortField = 'customer_id' | 'tolltime' | 'tollstatus' | 'toll_point_name' | 'toll_amount' | 'state' | 'connection_status'
type SortDirection = 'asc' | 'desc'

function DataTable({ transactions }: DataTableProps) {
  const [sortField, setSortField] = useState<SortField>('tolltime')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const sortedTransactions = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1

      // Handle different data types
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal as string).toLowerCase()
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [transactions, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to ascending
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return ' ⇅'
    return sortDirection === 'asc' ? ' ↑' : ' ↓'
  }

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th 
              onClick={() => handleSort('customer_id')}
              className={sortField === 'customer_id' ? 'sorted' : ''}
            >
              Customer ID{getSortIndicator('customer_id')}
            </th>
            <th 
              onClick={() => handleSort('tolltime')}
              className={sortField === 'tolltime' ? 'sorted' : ''}
            >
              Toll Time{getSortIndicator('tolltime')}
            </th>
            <th 
              onClick={() => handleSort('tollstatus')}
              className={sortField === 'tollstatus' ? 'sorted' : ''}
            >
              Status{getSortIndicator('tollstatus')}
            </th>
            <th 
              onClick={() => handleSort('toll_point_name')}
              className={sortField === 'toll_point_name' ? 'sorted' : ''}
            >
              Location{getSortIndicator('toll_point_name')}
            </th>
            <th 
              onClick={() => handleSort('toll_amount')}
              className={sortField === 'toll_amount' ? 'sorted' : ''}
            >
              Amount{getSortIndicator('toll_amount')}
            </th>
            <th 
              onClick={() => handleSort('state')}
              className={sortField === 'state' ? 'sorted' : ''}
            >
              State{getSortIndicator('state')}
            </th>
            <th 
              onClick={() => handleSort('connection_status')}
              className={sortField === 'connection_status' ? 'sorted' : ''}
            >
              Connection{getSortIndicator('connection_status')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTransactions.map((transaction) => (
            <tr key={transaction._id}>
              <td>{transaction.customer_id}</td>
              <td>{new Date(transaction.tolltime).toLocaleString()}</td>
              <td>
                <span className={`badge-${transaction.tollstatus}`}>
                  {transaction.tollstatus}
                </span>
              </td>
              <td>{transaction.toll_point_name}</td>
              <td className="amount">${transaction.toll_amount != null ? transaction.toll_amount.toFixed(2) : 'N/A'}</td>
              <td>{transaction.state}</td>
              <td>
                <span className={transaction.connection_status ? 'online' : 'offline'}>
                  {transaction.connection_status ? '✅' : '❌'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
