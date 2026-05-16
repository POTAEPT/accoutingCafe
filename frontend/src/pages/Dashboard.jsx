import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Edit, Plus, Save, Trash2 } from 'lucide-react'
import { deleteTransaction, downloadDailySummary, downloadPeriodSummary, downloadReceipt, getTransactionItems, getTransactions, voidTransaction } from '../api/reports'
import { createProduct, deleteProduct, getProducts, updateProduct } from '../api/products'
import { createAddon, deleteAddon, getAddons, updateAddon } from '../api/addons'

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

const VARIANT_LABELS_RECEIPT = {
  hot: 'ร้อน',
  iced: 'เย็น',
  frappe: 'ปั่น',
  regular: 'ปกติ'
}

const getVariantLabel = (variant) => {
  if (!variant) return ''
  return VARIANT_LABELS_RECEIPT[variant] || variant
}

const extractOptionsFromName = (name) => {
  if (!name) return ''
  const start = name.indexOf('(')
  const end = name.lastIndexOf(')')
  if (start === -1 || end === -1 || end <= start) return ''
  return name.slice(start + 1, end).trim()
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
  const [sortConfig, setSortConfig] = useState('date-desc')
  const [previewTransaction, setPreviewTransaction] = useState(null)
  const [previewItems, setPreviewItems] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [products, setProducts] = useState([])
  const [addons, setAddons] = useState([])
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false)
  const [addonMode, setAddonMode] = useState('create')
  const [addonForm, setAddonForm] = useState({
    id: null,
    name: '',
    category: 'addon',
    price: ''
  })
  const [addonErrors, setAddonErrors] = useState({ name: '', category: '', price: '' })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [form, setForm] = useState({
    id: null,
    name: '',
    category: 'Coffee',
    has_sweetness: true,
    allow_roast: true,
    allow_addons: true,
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
  const [formErrors, setFormErrors] = useState({
    name: '',
    category: '',
    prices: ''
  })

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

  const loadAddons = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await getAddons()
      setAddons(response.data || [])
    } catch (err) {
      setError('Unable to load add-ons. Please try again.')
      setAddons([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'menu') {
      loadProducts()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'addons') {
      loadAddons()
    }
  }, [activeTab])

  const totals = useMemo(() => {
    const totalQty = transactions.reduce((sum, item) => sum + Number(item.total_qty || 0), 0)
    const totalAmount = transactions.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)
    return { totalQty, totalAmount }
  }, [transactions])

  const sortedTransactions = useMemo(() => {
    const next = [...transactions]
    if (sortConfig === 'date-asc') {
      next.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      return next
    }
    if (sortConfig === 'az') {
      next.sort((a, b) => String(a.receipt_no || '').localeCompare(String(b.receipt_no || '')))
      return next
    }
    if (sortConfig === 'za') {
      next.sort((a, b) => String(b.receipt_no || '').localeCompare(String(a.receipt_no || '')))
      return next
    }
    next.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return next
  }, [transactions, sortConfig])

  const openAddonCreateModal = () => {
    setAddonMode('create')
    setAddonErrors({ name: '', category: '', price: '' })
    setAddonForm({ id: null, name: '', category: 'addon', price: '' })
    setIsAddonModalOpen(true)
  }

  const openAddonEditModal = (addon) => {
    setAddonMode('edit')
    setAddonErrors({ name: '', category: '', price: '' })
    setAddonForm({
      id: addon.id,
      name: addon.name || '',
      category: addon.category || 'addon',
      price: addon.price ?? ''
    })
    setIsAddonModalOpen(true)
  }

  const closeAddonModal = () => {
    setIsAddonModalOpen(false)
  }

  const submitAddonForm = async (event) => {
    event.preventDefault()
    const hasName = addonForm.name.trim()
    const hasCategory = addonForm.category.trim()
    const hasPrice = addonForm.price !== '' && addonForm.price !== null && addonForm.price !== undefined
    const nextErrors = {
      name: hasName ? '' : 'กรุณาระบุชื่อตัวเลือก',
      category: hasCategory ? '' : 'กรุณาระบุประเภท',
      price: hasPrice ? '' : 'กรุณาระบุราคา'
    }
    setAddonErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      setError('กรุณากรอกข้อมูลตัวเลือกเสริมให้ครบถ้วน')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const payload = {
        name: addonForm.name.trim(),
        category: addonForm.category,
        price: Number(addonForm.price)
      }

      if (addonMode === 'create') {
        await createAddon(payload)
      } else if (addonForm.id) {
        await updateAddon(addonForm.id, payload)
      }

      await loadAddons()
      closeAddonModal()
    } catch (err) {
      setError('บันทึกตัวเลือกเสริมไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAddon = async (addon) => {
    if (!addon?.id) return
    const confirmed = window.confirm('ลบตัวเลือกเสริมใช่หรือไม่? การลบจะไม่สามารถกู้คืนได้')
    if (!confirmed) return
    await deleteAddon(addon.id)
    await loadAddons()
  }

  const getAddonCategoryLabel = (category) => {
    return category === 'roast' ? 'ระดับการคั่ว' : 'Add-on'
  }

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

  const handlePreviewTransaction = async (transaction) => {
    if (!transaction) return
    setPreviewTransaction(transaction)
    setPreviewItems([])
    setPreviewLoading(true)
    try {
      const response = await getTransactionItems(transaction.id)
      setPreviewItems(response.data || [])
    } catch (err) {
      setPreviewItems([])
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = () => {
    setPreviewTransaction(null)
    setPreviewItems([])
    setPreviewLoading(false)
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

  const hasValidPriceSelection = (nextForm) => {
    if (nextForm.toggles.regular) {
      return nextForm.prices.regular !== '' && nextForm.prices.regular !== null && nextForm.prices.regular !== undefined
    }
    if (nextForm.toggles.hot && nextForm.prices.hot !== '' && nextForm.prices.hot !== null && nextForm.prices.hot !== undefined) return true
    if (nextForm.toggles.iced && nextForm.prices.iced !== '' && nextForm.prices.iced !== null && nextForm.prices.iced !== undefined) return true
    if (nextForm.toggles.frappe && nextForm.prices.frappe !== '' && nextForm.prices.frappe !== null && nextForm.prices.frappe !== undefined) return true
    return false
  }

  const openCreateModal = () => {
    setModalMode('create')
    setFormErrors({ name: '', category: '', prices: '' })
    setForm({
      id: null,
      name: '',
      category: 'Coffee',
      has_sweetness: true,
      allow_roast: true,
      allow_addons: true,
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
    setFormErrors({ name: '', category: '', prices: '' })
    const prices = product.prices || {}
    const useRegular = prices.regular !== undefined
    setModalMode('edit')
    setForm({
      id: product.id,
      name: product.name || '',
      category: product.category || 'Coffee',
      has_sweetness: product.has_sweetness !== false,
      allow_roast: product.allow_roast !== false,
      allow_addons: product.allow_addons !== false,
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
    const hasPrice = hasValidPriceSelection(form)
    const nextErrors = {
      name: form.name.trim() ? '' : 'กรุณาระบุชื่อเมนู',
      category: form.category.trim() ? '' : 'กรุณาระบุหมวดหมู่',
      prices: hasPrice ? '' : 'กรุณาระบุราคาอย่างน้อย 1 ช่อง'
    }
    setFormErrors(nextErrors)
    const hasErrors = Object.values(nextErrors).some(Boolean)
    if (hasErrors) {
      setError('กรุณากรอกข้อมูลสินค้าให้ครบถ้วน')
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
        allow_roast: form.allow_roast,
        allow_addons: form.allow_addons,
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

  const handleDeleteProduct = async (product) => {
    if (!product?.id) return
    const confirmed = window.confirm('ลบสินค้าใช่หรือไม่? การลบจะไม่สามารถกู้คืนได้')
    if (!confirmed) return
    await deleteProduct(product.id)
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
            จัดการเมนูสินค้า
          </button>
          <button
            onClick={() => setActiveTab('addons')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'addons'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            จัดการตัวเลือกเสริม (Add-ons)
          </button>
        </div>

        {activeTab === 'menu' ? (
          <section className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">จัดการเมนูสินค้า</h2>
                <p className="text-sm text-slate-500">เพิ่ม แก้ไข หรือลบสินค้าในร้าน</p>
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
                  เพิ่มเมนูสินค้า
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
                    <th className="py-3 px-2">ชื่อเมนู</th>
                    <th className="py-3 px-2">หมวดหมู่</th>
                    <th className="py-3 px-2">ราคา</th>
                    <th className="py-3 px-2">ตัวเลือก</th>
                    <th className="py-3 px-2">สถานะ</th>
                    <th className="py-3 px-2 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 && !isLoading ? (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-slate-400">
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
                          <div className="flex flex-wrap gap-2">
                            {product.has_sweetness ? (
                              <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-700">ความหวาน</span>
                            ) : null}
                            {product.allow_roast ? (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">เลือกระดับคั่ว</span>
                            ) : null}
                            {product.allow_addons ? (
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">Add-ons</span>
                            ) : null}
                            {!product.has_sweetness && !product.allow_roast && !product.allow_addons ? (
                              <span className="text-xs text-slate-400">-</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <button
                            onClick={() => toggleActive(product)}
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors ${product.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}
                          >
                            {product.is_active ? 'เปิดขาย' : 'ปิดการขาย'}
                          </button>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(product)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"
                              title="แก้ไข"
                              aria-label="แก้ไข"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 text-rose-700 hover:bg-rose-50"
                              title="ลบ"
                              aria-label="ลบ"
                            >
                              <Trash2 size={14} />
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
        {activeTab === 'addons' ? (
          <section className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">จัดการตัวเลือกเสริม (Add-ons)</h2>
                <p className="text-sm text-slate-500">เพิ่ม แก้ไข หรือลบตัวเลือกเสริม</p>
              </div>
              <div className="flex items-center gap-3">
                {isLoading ? (
                  <span className="text-xs text-slate-400">Loading...</span>
                ) : null}
                <button
                  onClick={openAddonCreateModal}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-100 hover:bg-blue-700"
                >
                  <Plus size={14} />
                  เพิ่มตัวเลือก
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
                    <th className="py-3 px-2">ชื่อ</th>
                    <th className="py-3 px-2">ประเภท</th>
                    <th className="py-3 px-2">ราคา</th>
                    <th className="py-3 px-2 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {addons.length === 0 && !isLoading ? (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-slate-400">
                        No add-ons found.
                      </td>
                    </tr>
                  ) : (
                    addons.map((addon) => (
                      <tr key={addon.id} className="border-t border-slate-100">
                        <td className="py-3 px-2 font-semibold text-slate-800">{addon.name}</td>
                        <td className="py-3 px-2 text-slate-500">{getAddonCategoryLabel(addon.category)}</td>
                        <td className="py-3 px-2 text-slate-600">฿{Number(addon.price)}</td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openAddonEditModal(addon)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"
                              title="แก้ไข"
                              aria-label="แก้ไข"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteAddon(addon)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 text-rose-700 hover:bg-rose-50"
                              title="ลบ"
                              aria-label="ลบ"
                            >
                              <Trash2 size={14} />
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
                    {modalMode === 'create' ? 'เพิ่มเมนูสินค้า' : 'แก้ไขเมนูสินค้า'}
                  </h3>
                  <p className="text-sm text-slate-500">กรอกข้อมูลและราคาให้ครบถ้วน</p>
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
                  <label className="text-sm font-semibold text-slate-700">ชื่อเมนู</label>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น อเมริกาโน่"
                    required
                  />
                  {formErrors.name ? (
                    <p className="mt-2 text-xs text-rose-600">{formErrors.name}</p>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">หมวดหมู่</label>
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
                  {formErrors.category ? (
                    <p className="mt-2 text-xs text-rose-600">{formErrors.category}</p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-700">ราคา (ระบุ 0 หากต้องการกรอกราคาเองที่หน้าร้าน)</p>
                  <p className="text-xs text-slate-400 mb-3">กำหนดราคาแบบแยกหรือราคาเดียว</p>
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
                          <span>{key === 'hot' ? 'ร้อน' : key === 'iced' ? 'เย็น' : 'ปั่น'}</span>
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
                        <span>ปกติ</span>
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
                  {formErrors.prices ? (
                    <p className="mt-2 text-xs text-rose-600">{formErrors.prices}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.has_sweetness}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, has_sweetness: event.target.checked }))
                      }
                    />
                    มีระดับความหวาน
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.allow_roast}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, allow_roast: event.target.checked }))
                      }
                    />
                    เปิดใช้งานตัวเลือกระดับการคั่ว
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.allow_addons}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, allow_addons: event.target.checked }))
                      }
                    />
                    เปิดใช้งานตัวเลือกเพิ่มเติม / Add-ons
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, is_active: event.target.checked }))
                      }
                    />
                    เปิดขาย
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <Save size={16} />
                    บันทึก
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
        {isAddonModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {addonMode === 'create' ? 'เพิ่มตัวเลือกเสริม' : 'แก้ไขตัวเลือกเสริม'}
                  </h3>
                  <p className="text-sm text-slate-500">ระบุชื่อ ประเภท และราคา</p>
                </div>
                <button
                  onClick={closeAddonModal}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={submitAddonForm} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">ชื่อ</label>
                  <input
                    value={addonForm.name}
                    onChange={(event) => setAddonForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น เพิ่มวิปครีม"
                    required
                  />
                  {addonErrors.name ? (
                    <p className="mt-2 text-xs text-rose-600">{addonErrors.name}</p>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">ประเภท</label>
                  <select
                    value={addonForm.category}
                    onChange={(event) => setAddonForm((prev) => ({ ...prev, category: event.target.value }))}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="roast">ระดับการคั่ว</option>
                    <option value="addon">Add-on</option>
                  </select>
                  {addonErrors.category ? (
                    <p className="mt-2 text-xs text-rose-600">{addonErrors.category}</p>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">ราคา</label>
                  <input
                    type="number"
                    value={addonForm.price}
                    onChange={(event) => setAddonForm((prev) => ({ ...prev, price: event.target.value }))}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    min="0"
                    required
                  />
                  {addonErrors.price ? (
                    <p className="mt-2 text-xs text-rose-600">{addonErrors.price}</p>
                  ) : null}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeAddonModal}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <Save size={16} />
                    บันทึก
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
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Cups</p>
                  <p className="mt-2 text-3xl font-bold text-slate-800">{totals.totalQty}</p>
                  <p className="text-xs text-slate-500">cups sold</p>
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
                <div className="flex items-center gap-3">
                  <select
                    value={sortConfig}
                    onChange={(event) => setSortConfig(event.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="date-desc">Date: Newest</option>
                    <option value="date-asc">Date: Oldest</option>
                    <option value="az">Receipt: A-Z</option>
                    <option value="za">Receipt: Z-A</option>
                  </select>
                  {isLoading ? (
                    <span className="text-xs text-slate-400">Loading...</span>
                  ) : null}
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
                      <th className="py-3 px-2">Receipt No</th>
                      <th className="py-3 px-2">Time</th>
                      <th className="py-3 px-2">Total</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTransactions.length === 0 && !isLoading ? (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-slate-400">
                          No transactions found for this date.
                        </td>
                      </tr>
                    ) : (
                      sortedTransactions.map((transaction) => (
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
                                onClick={() => handlePreviewTransaction(transaction)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                              >
                                ดูรายละเอียด
                              </button>
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

      {previewTransaction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">รายละเอียดบิล</h3>
                <p className="text-sm text-slate-500">Receipt No: {previewTransaction.receipt_no}</p>
              </div>
              <button
                onClick={closePreview}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-600">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Created at</p>
                <p className="font-semibold text-slate-700">
                  {previewTransaction.created_at ? new Date(previewTransaction.created_at).toLocaleString('en-US') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Payment method</p>
                <p className="font-semibold text-slate-700">{previewTransaction.payment_method || '-'}</p>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th className="py-2 px-2">Item</th>
                    <th className="py-2 px-2">ตัวเลือก</th>
                    <th className="py-2 px-2">ความหวาน</th>
                    <th className="py-2 px-2">Qty</th>
                    <th className="py-2 px-2">Unit</th>
                    <th className="py-2 px-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {previewLoading ? (
                    <tr>
                      <td colSpan="7" className="py-4 text-center text-slate-400">
                        Loading items...
                      </td>
                    </tr>
                  ) : previewItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-4 text-center text-slate-400">
                        No item details available.
                      </td>
                    </tr>
                  ) : (
                    previewItems.map((item, index) => (
                      <tr key={`${previewTransaction.id}-item-${index}`} className="border-t border-slate-100">
                        <td className="py-2 px-2 font-semibold text-slate-700">
                          {item.product_name}
                        </td>
                        <td className="py-2 px-2 text-slate-500">
                          {extractOptionsFromName(item.product_name) || getVariantLabel(item.product_variant) || '-'}
                        </td>
                        <td className="py-2 px-2 text-slate-500">
                          {item.sweetness ? `หวาน ${item.sweetness}%` : '-'}
                        </td>
                        <td className="py-2 px-2 text-slate-500">{item.quantity}</td>
                        <td className="py-2 px-2 text-slate-500">{formatMoney(item.unit_price)}</td>
                        <td className="py-2 px-2 text-right font-semibold text-slate-700">
                          {formatMoney(item.subtotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex items-center justify-end">
              <button
                onClick={closePreview}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default Dashboard
