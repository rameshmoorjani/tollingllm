import React from 'react'
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

function DataTable({ transactions }: DataTableProps) {
  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Customer ID</th>
            <th>Toll Time</th>
            <th>Status</th>
            <th>Location</th>
            <th>Amount</th>
            <th>State</th>
            <th>Connection</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction._id}>
              <td>{transaction.customer_id}</td>
              <td>{new Date(transaction.tolltime).toLocaleString()}</td>
              <td>
                <span className={`badge-${transaction.tollstatus}`}>
                  {transaction.tollstatus}
                </span>
              </td>
              <td>{transaction.toll_point_name}</td>
              <td className="amount">${transaction.toll_amount.toFixed(2)}</td>
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
