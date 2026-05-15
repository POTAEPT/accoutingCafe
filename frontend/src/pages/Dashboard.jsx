import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Edit, Plus, Save, Trash2 } from 'lucide-react'
import { deleteTransaction, downloadDailySummary, downloadPeriodSummary, downloadReceipt, getTransactions, voidTransaction } from '../api/reports'
import { createProduct, getProducts, updateProduct } from '../api/products'

const formatMoney = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'THB'
  }).format(value || 0)
}

const formatTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('sales')
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().slice(0, 10)
  })
  const [rangeStart, setRangeStart] = useState(() => new Date().toISOString().slice(0, 10))
  const [rangeEnd, setRangeEnd] = useState(() => new Date().toISOString().slice(0, 10))
  const [transactions, setTransactions] = useState([])
  const [products, setProducts] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [form, setForm] = useState({
    id: null,
    name: '',
    category: 'Coffee',
    has_sweetness: true,
    is_active: true,
    prices: {
      hot: '',
      iced: '',
      frappe: '',
      regular: ''
    },
    toggles: {
      hot: false,
      iced: false,
      frappe: false,
      regular: false
    }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadTransactions = async (startDate, endDate) => {
    setIsLoading(true)
    setError('')
    try {
      const response = await getTransactions({ startDate, endDate })
      setTransactions(response.data || [])
    } catch (err) {
      setError('Unable to load transactions. Please try again.')
      setTransactions([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions(rangeStart, rangeEnd)
  }, [rangeStart, rangeEnd])

  const loadProducts = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await getProducts(true)
      setProducts(response.data || [])
    } catch (err) {
      setError('Unable to load products. Please try again.')
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'menu') {
      loadProducts()
    }
  }, [activeTab])

  const totals = useMemo(() => {
    const totalSales = transactions.length
    const totalAmount = transactions.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)
    return { totalSales, totalAmount }
  }, [transactions])

  const handleDailySummary = async () => {
    await downloadDailySummary(selectedDate)
  }

  const handlePeriodSummary = async () => {
    if (!rangeStart || !rangeEnd) return
    await downloadPeriodSummary(rangeStart, rangeEnd)
  }

  const handleReceiptDownload = async (receiptNo) => {
    if (!receiptNo) return
    await downloadReceipt(receiptNo)
  }

  const handleVoidTransaction = async (transactionId) => {
    if (!transactionId) return
    await voidTransaction(transactionId)
    await loadTransactions(rangeStart, rangeEnd)
  }

  const handleDeleteTransaction = async (transactionId) => {
    if (!transactionId) return
    const confirmed = window.confirm('Delete this transaction permanently? This cannot be undone.')
    if (!confirmed) return
    await deleteTransaction(transactionId)
    await loadTransactions(rangeStart, rangeEnd)
  }

  const buildPricesPayload = (nextForm) => {
    const prices = {}
    const useRegular = nextForm.toggles.regular

    if (useRegular) {
      if (nextForm.prices.regular !== '') {
        prices.regular = Number(nextForm.prices.regular)
      }
      return prices
    }

    if (nextForm.toggles.hot && nextForm.prices.hot !== '') {
      prices.hot = Number(nextForm.prices.hot)
    }
    if (nextForm.toggles.iced && nextForm.prices.iced !== '') {
      prices.iced = Number(nextForm.prices.iced)
    }
    if (nextForm.toggles.frappe && nextForm.prices.frappe !== '') {
      prices.frappe = Number(nextForm.prices.frappe)
    }

    return prices
  }

  const openCreateModal = () => {
    setModalMode('create')
    setForm({
      id: null,
      name: '',
      category: 'Coffee',
      has_sweetness: true,
      is_active: true,
      prices: {
        hot: '',
        iced: '',
        frappe: '',
        regular: ''
      },
      toggles: {
        hot: false,
        iced: false,
        frappe: false,
        regular: false
      }
    })
    setIsModalOpen(true)
  }

  const openEditModal = (product) => {
    const prices = product.prices || {}
    const useRegular = prices.regular !== undefined
    setModalMode('edit')
    setForm({
      id: product.id,
      name: product.name || '',
      category: product.category || 'Coffee',
      has_sweetness: product.has_sweetness !== false,
      is_active: product.is_active !== false,
      prices: {
        hot: prices.hot ?? '',
        iced: prices.iced ?? '',
        frappe: prices.frappe ?? '',
        regular: prices.regular ?? ''
      },
      toggles: {
        hot: !useRegular && prices.hot !== undefined,
        iced: !useRegular && prices.iced !== undefined,
        frappe: !useRegular && prices.frappe !== undefined,
        regular: useRegular
      }
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const submitForm = async (event) => {
    event.preventDefault()
    const pricesPayload = buildPricesPayload(form)
    const hasPrice = Object.keys(pricesPayload).length > 0

    if (!form.name.trim() || !form.category.trim() || !hasPrice) {
      setError('กรุณากรอกข้อมูลสินค้าและราคาให้ครบ')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        prices: pricesPayload,
        has_sweetness: form.has_sweetness,
        is_active: form.is_active
      }

      if (modalMode === 'create') {
        await createProduct(payload)
      } else {
        if (form.id) {
          await updateProduct(form.id, payload)
        }
      }

      await loadProducts()
      closeModal()
    } catch (err) {
      setError('บันทึกสินค้าไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleActive = async (product) => {
    await updateProduct(product.id, { is_active: !product.is_active })
    await loadProducts()
  }

  const formatPriceSet = (prices) => {
    if (!prices) return []
    const order = ['hot', 'iced', 'frappe', 'regular']
    return order
      .filter((key) => prices[key] !== undefined)
      .map((key) => ({ key, value: prices[key] }))
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Coffee Shop</p>
            <h1 className="text-2xl font-bold">Sales Dashboard</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/pos')}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Back to POS
            </button>
            <button
              onClick={handleDailySummary}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-100 transition hover:bg-emerald-700"
            >
              Export Daily Summary PDF
            </button>
            <button
              onClick={handlePeriodSummary}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700"
            >
              Export Period Summary PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('sales')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'sales'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Sales
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'menu'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Manage Menu
          </button>
        </div>

        {activeTab === 'menu' ? (
          <section className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Menu Manager</h2>
                <p className="text-sm text-slate-500">Update prices and toggle active items.</p>
              </div>
              <div className="flex items-center gap-3">
                {isLoading ? (
                  <span className="text-xs text-slate-400">Loading...</span>
                ) : null}
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-100 hover:bg-blue-700"
                >
                  <Plus size={14} />
                  Add Product
                </button>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3 border border-red-100">
                {error}
              </div>
            ) : null}

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th className="py-3 px-2">Name</th>
                    <th className="py-3 px-2">Category</th>
                    <th className="py-3 px-2">Prices</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 && !isLoading ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-slate-400">
                        No products found.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="border-t border-slate-100">
                        <td className="py-3 px-2 font-semibold text-slate-800">
                          {product.name}
                        </td>
                        <td className="py-3 px-2 text-slate-500">
                          {product.category}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-wrap gap-2">
                            {formatPriceSet(product.prices).map((item) => (
                              <span
                                key={`${product.id}-${item.key}`}
                                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                              >
                                {item.key}: ฿{Number(item.value)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                            {product.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(product)}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            >
                              <Edit size={14} />
                              Edit
                            </button>
                            <button
                              onClick={() => toggleActive(product)}
                              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 ${product.is_active ? 'border-rose-200 text-rose-600' : 'border-emerald-200 text-emerald-600'}`}
                            >
                              <Trash2 size={14} />
                              {product.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
        {isModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {modalMode === 'create' ? 'Add Product' : 'Edit Product'}
                  </h3>
                  <p className="text-sm text-slate-500">Fill in prices and options.</p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={submitForm} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Name</label>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Latte"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Category</label>
                  <select
                    value={form.category}
                    onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Coffee">Coffee</option>
                    <option value="Tea">Tea</option>
                    <option value="Milk">Milk</option>
                    <option value="Juice/Soda">Juice/Soda</option>
                  </select>
                </div>

                <div className="rounded-xl border border-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-700">Prices</p>
                  <p className="text-xs text-slate-400 mb-3">Choose hot/iced/frappe or single price.</p>
                  <div className="space-y-3">
                    {['hot', 'iced', 'frappe'].map((key) => (
                      <label key={key} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.toggles[key]}
                            disabled={form.toggles.regular}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                toggles: { ...prev.toggles, [key]: event.target.checked }
                              }))
                            }
                          />
                          <span className="capitalize">{key}</span>
                        </div>
                        <input
                          type="number"
                          value={form.prices[key]}
                          disabled={!form.toggles[key] || form.toggles.regular}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              prices: { ...prev.prices, [key]: event.target.value }
                            }))
                          }
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </label>
                    ))}
                    <label className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.toggles.regular}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              toggles: {
                                hot: false,
                                iced: false,
                                frappe: false,
                                regular: event.target.checked
                              }
                            }))
                          }
                        />
                        <span>Single price</span>
                      </div>
                      <input
                        type="number"
                        value={form.prices.regular}
                        disabled={!form.toggles.regular}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            prices: { ...prev.prices, regular: event.target.value }
                          }))
                        }
                        className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.has_sweetness}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, has_sweetness: event.target.checked }))
                      }
                    />
                    Enable sweetness
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, is_active: event.target.checked }))
                      }
                    />
                    Active
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <Save size={16} />
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {activeTab === 'sales' ? (
          <>
            <section className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-100 p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Daily Overview</h2>
                  <p className="text-sm text-slate-500">Track sales by date and export receipts.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Daily date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(event) => setSelectedDate(event.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Start date</label>
                    <input
                      type="date"
                      value={rangeStart}
                      onChange={(event) => setRangeStart(event.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">End date</label>
                    <input
                      type="date"
                      value={rangeEnd}
                      onChange={(event) => setRangeEnd(event.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Sales</p>
                  <p className="mt-2 text-3xl font-bold text-slate-800">{totals.totalSales}</p>
                  <p className="text-xs text-slate-500">transactions</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Amount</p>
                  <p className="mt-2 text-3xl font-bold text-slate-800">{formatMoney(totals.totalAmount)}</p>
                  <p className="text-xs text-slate-500">gross revenue</p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Transactions</h2>
                  <p className="text-sm text-slate-500">Receipts for {rangeStart} - {rangeEnd}</p>
                </div>
                {isLoading ? (
                  <span className="text-xs text-slate-400">Loading...</span>
                ) : null}
              </div>

              {error ? (
                <div className="mt-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3 border border-red-100">
                  {error}
                </div>
              ) : null}

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    <tr>
                      <th className="py-3 px-2">Receipt No</th>
                      <th className="py-3 px-2">Time</th>
                      <th className="py-3 px-2">Total</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 && !isLoading ? (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-slate-400">
                          No transactions found for this date.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-t border-slate-100">
                          <td className="py-3 px-2 font-semibold text-slate-800">
                            {transaction.receipt_no}
                          </td>
                          <td className="py-3 px-2 text-slate-500">
                            {formatTime(transaction.created_at)}
                          </td>
                          <td className="py-3 px-2 font-semibold text-slate-700">
                            {formatMoney(transaction.total_amount)}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${transaction.status === 'VOID' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'}`}>
                              {transaction.status || 'COMPLETED'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <button
                                onClick={() => handleReceiptDownload(transaction.receipt_no)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                              >
                                <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                                Print PDF
                              </button>
                              <button
                                onClick={() => handleVoidTransaction(transaction.id)}
                                disabled={transaction.status === 'VOID'}
                                className="inline-flex items-center gap-2 rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <AlertTriangle size={14} />
                                Void
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  )
}

export default Dashboard
