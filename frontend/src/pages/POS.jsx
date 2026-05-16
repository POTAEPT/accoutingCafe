import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTransaction } from '../api/transaction'
import { getProducts } from '../api/products'
import { getAddons } from '../api/addons'

const PRICE_ORDER = ['hot', 'iced', 'frappe', 'regular']
const VARIANT_LABELS = {
  hot: 'Hot',
  iced: 'Iced',
  frappe: 'Frappe',
  regular: 'Regular'
}
const VARIANT_LABELS_RECEIPT = {
  hot: 'ร้อน',
  iced: 'เย็น',
  frappe: 'ปั่น',
  regular: 'ปกติ'
}
const DEFAULT_ROAST = { id: 'default', name: 'ปกติ', price: 0, category: 'roast' }

function POS() {
  const navigate = useNavigate()
  const [cart, setCart] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [isLoadingMenu, setIsLoadingMenu] = useState(false)
  const [menuError, setMenuError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState('')
  const [selectedSweetness, setSelectedSweetness] = useState('100')
  const [selectedRoast, setSelectedRoast] = useState(DEFAULT_ROAST.id)
  const [selectedAddons, setSelectedAddons] = useState([])
  const [customPrice, setCustomPrice] = useState('')
  const [selectedBringOwnCup, setSelectedBringOwnCup] = useState(false)
  const [availableAddons, setAvailableAddons] = useState([])
  const [addonError, setAddonError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [isManualId, setIsManualId] = useState(false)
  const [manualReceiptNo, setManualReceiptNo] = useState('')

  const loadMenu = async () => {
    setIsLoadingMenu(true)
    setMenuError('')
    try {
      const response = await getProducts(false)
      const products = response.data || []
      setMenuItems(products)
      if (products.length > 0) {
        setActiveCategory('All')
      }
    } catch (err) {
      setMenuError('โหลดเมนูไม่สำเร็จ ลองใหม่อีกครั้ง')
      setMenuItems([])
    } finally {
      setIsLoadingMenu(false)
    }
  }

  useEffect(() => {
    loadMenu()
  }, [])

  useEffect(() => {
    const loadAddons = async () => {
      setAddonError('')
      try {
        const response = await getAddons()
        setAvailableAddons(response.data || [])
      } catch (err) {
        setAddonError('โหลดตัวเลือกเสริมไม่สำเร็จ')
        setAvailableAddons([])
      }
    }

    loadAddons()
  }, [])

  const roastOptions = useMemo(() => {
    const roasts = availableAddons.filter((item) => item.category === 'roast')
    const mapped = roasts.map((item) => ({
      id: item.id,
      label: item.name,
      price: Number(item.price)
    }))
    const hasDefault = mapped.some((item) => item.label === DEFAULT_ROAST.name && item.price === 0)
    return hasDefault ? mapped : [{ id: DEFAULT_ROAST.id, label: DEFAULT_ROAST.name, price: DEFAULT_ROAST.price }, ...mapped]
  }, [availableAddons])

  const addonOptions = useMemo(() => {
    return availableAddons
      .filter((item) => item.category === 'addon')
      .map((item) => ({ id: item.id, label: item.name, price: Number(item.price) }))
  }, [availableAddons])

  const normalizePrices = (prices) => {
    if (!prices) return {}
    if (typeof prices === 'string') {
      try {
        return JSON.parse(prices)
      } catch (err) {
        return {}
      }
    }
    return prices
  }

  const getVariantOptions = (prices) => {
    return PRICE_ORDER.filter((key) => prices[key] !== undefined)
  }

  const getVariantLabel = (variant) => {
    return VARIANT_LABELS[variant] || variant
  }

  const getVariantReceiptLabel = (variant) => {
    return VARIANT_LABELS_RECEIPT[variant] || getVariantLabel(variant)
  }

  const getRoastOption = (roastId) => {
    return roastOptions.find((option) => option.id === roastId)
  }

  const getAddonOption = (addonId) => {
    return addonOptions.find((option) => option.id === addonId)
  }

  const getAddonTotal = (addons) => {
    return (addons || []).reduce((sum, addonId) => {
      const addon = getAddonOption(addonId)
      return sum + (addon ? addon.price : 0)
    }, 0)
  }

  const buildOptionLabel = ({ variant, roastId, addons, sweetness, bringOwnCup }) => {
    const parts = []
    if (variant) {
      parts.push(getVariantReceiptLabel(variant))
    }
    if (roastId) {
      const roast = getRoastOption(roastId)
      if (roast) {
        parts.push(roast.label)
      }
    }
    const addonLabels = (addons || [])
      .map((addonId) => getAddonOption(addonId))
      .filter(Boolean)
      .map((addon) => addon.label)
    parts.push(...addonLabels)
    if (sweetness) {
      parts.push(`หวาน ${sweetness}%`)
    }
    if (bringOwnCup) {
      parts.push('นำแก้วมาเอง')
    }
    return parts.join(', ')
  }

  const buildDisplayName = (baseName, optionLabel) => {
    if (!optionLabel) return baseName
    return `${baseName} (${optionLabel})`
  }

  const buildCartOptionLabel = (entry) => {
    return buildOptionLabel({
      variant: entry.variant,
      roastId: entry.roast,
      addons: entry.addons,
      sweetness: entry.sweetness,
      bringOwnCup: entry.bringOwnCup
    })
  }

  const isIceProduct = (product) => {
    return Boolean(product?.name?.includes('น้ำแข็ง'))
  }

  const buildCartKey = (productId, variant, sweetness, roast, addons, price, bringOwnCup) => {
    const addonKey = (addons || []).slice().sort().join('-') || 'none'
    return `${productId}__${variant || 'regular'}__${sweetness || 'none'}__${roast || 'none'}__${addonKey}__${price || '0'}__${bringOwnCup ? 'owncup' : 'normal'}`
  }

  const addToCart = (entry) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.key === entry.key)
      if (existing) {
        return prev.map((item) =>
          item.key === entry.key ? { ...item, qty: item.qty + 1 } : item
        )
      }
      return [...prev, { ...entry, qty: 1 }]
    })
  }

  const handleMenuClick = (product) => {
    const prices = normalizePrices(product.prices)
    const options = getVariantOptions(prices)

    if (!options[0]) return

    setSelectedProduct({ ...product, prices })
    const allowRoast = product.allow_roast !== false
    const allowAddons = product.allow_addons !== false

    setSelectedVariant(options[0])
    setSelectedSweetness('100')
    const defaultRoast = roastOptions[0]?.id || DEFAULT_ROAST.id
    setSelectedRoast(allowRoast ? defaultRoast : '')
    setSelectedAddons([])
    setCustomPrice('')
    setSelectedBringOwnCup(false)
  }

  const confirmVariant = () => {
    if (!selectedProduct) return
    const isIce = isIceProduct(selectedProduct)

    if (isIce) {
      const parsedPrice = Number(customPrice)
      if (!parsedPrice || parsedPrice <= 0) return
      const finalUnitPrice = Math.max(0, parsedPrice - (selectedBringOwnCup ? 5 : 0))
      const optionLabel = buildOptionLabel({ bringOwnCup: selectedBringOwnCup })
      const displayName = buildDisplayName(selectedProduct.name, optionLabel)
      const entry = {
        key: buildCartKey(selectedProduct.id, 'custom', '', '', [], finalUnitPrice, selectedBringOwnCup),
        id: selectedProduct.id,
        baseName: selectedProduct.name,
        displayName,
        variant: '',
        sweetness: '',
        roast: '',
        addons: [],
        is_cup: selectedProduct.is_cup !== false,
        bringOwnCup: selectedBringOwnCup,
        price: finalUnitPrice
      }
      addToCart(entry)
      setSelectedProduct(null)
      return
    }

    const basePrice = selectedProduct.prices?.[selectedVariant]
    if (basePrice === undefined) return

    const allowRoast = selectedProduct.allow_roast !== false
    const allowAddons = selectedProduct.allow_addons !== false
    const roast = allowRoast ? getRoastOption(selectedRoast) : null
    const roastPrice = roast ? roast.price : 0
    const addonsPrice = allowAddons ? getAddonTotal(selectedAddons) : 0
    const finalUnitPrice = Math.max(0, Number(basePrice) + roastPrice + addonsPrice - (selectedBringOwnCup ? 5 : 0))
    const sweetness = selectedProduct.has_sweetness ? selectedSweetness : ''
    const optionLabel = buildOptionLabel({
      variant: selectedVariant,
      roastId: allowRoast ? selectedRoast : '',
      addons: allowAddons ? selectedAddons : [],
      sweetness,
      bringOwnCup: selectedBringOwnCup
    })
    const displayName = buildDisplayName(selectedProduct.name, optionLabel)

    const entry = {
      key: buildCartKey(selectedProduct.id, selectedVariant, sweetness, selectedRoast, selectedAddons, finalUnitPrice, selectedBringOwnCup),
      id: selectedProduct.id,
      baseName: selectedProduct.name,
      displayName,
      variant: selectedVariant,
      sweetness,
      roast: allowRoast ? selectedRoast : '',
      addons: allowAddons ? selectedAddons : [],
      is_cup: selectedProduct.is_cup !== false,
      bringOwnCup: selectedBringOwnCup,
      price: Number(finalUnitPrice)
    }
    addToCart(entry)
    setSelectedProduct(null)
  }

  const decreaseItem = (itemKey) => {
    setCart((prev) =>
      prev
        .map((entry) =>
          entry.key === itemKey ? { ...entry, qty: entry.qty - 1 } : entry
        )
        .filter((entry) => entry.qty > 0)
    )
  }

  const removeItem = (itemKey) => {
    setCart((prev) => prev.filter((entry) => entry.key !== itemKey))
  }

  const total = useMemo(() => {
    return cart.reduce((sum, entry) => sum + entry.price * entry.qty, 0)
  }, [cart])

  const totalQty = useMemo(() => {
    return cart.reduce((sum, entry) => sum + (entry.is_cup ? entry.qty : 0), 0)
  }, [cart])

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setIsSubmitting(true)
    setStatus('')
    try {
      const payload = {
        payment_method: paymentMethod,
        record_date: recordDate,
        manual_receipt_no: isManualId ? manualReceiptNo : null,
        items: cart.map((entry) => {
          return {
            product_id: entry.id,
            product_name: entry.displayName || entry.name,
            quantity: entry.qty,
            unit_price: entry.price,
            product_variant: entry.variant,
            sweetness: entry.sweetness,
            is_cup: entry.is_cup
          }
        })
      }

      await createTransaction(payload)

      setCart([])
      setStatus('✅ บันทึกยอดขายสำเร็จเรียบร้อย!')
    } catch (err) {
      if (err?.response?.status === 409) {
        alert('เซฟไม่ได้: เลขที่บิลนี้มีอยู่ในระบบแล้ว กรุณาเปลี่ยนเลขใหม่')
        setStatus('❌ เลขที่บิลซ้ำ กรุณาเปลี่ยนเลขใหม่')
      } else {
        setStatus('❌ เกิดข้อผิดพลาด ไม่สามารถบันทึกได้ ลองเช็ค Console ดูครับ')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const categories = useMemo(() => {
    const unique = Array.from(new Set(menuItems.map((item) => item.category))).filter(Boolean)
    return ['All', ...unique]
  }, [menuItems])

  const filteredItems = useMemo(() => {
    if (activeCategory === 'All') return menuItems
    return menuItems.filter((item) => item.category === activeCategory)
  }, [menuItems, activeCategory])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login', { replace: true })
  }

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden">
      <header className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Coffee Shop</p>
              <h1 className="text-2xl font-bold">POS Register</h1>
            </div>
            <div className="flex items-center gap-3 sm:border-l sm:border-slate-200 sm:pl-6">
              <label className="text-[10px] uppercase font-bold text-slate-400">Record Date</label>
              <input
                type="date"
                value={recordDate}
                onChange={(event) => setRecordDate(event.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr] flex-1 overflow-hidden">
        <section className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-100 p-6 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">เมนูเครื่องดื่ม</h2>
              <p className="text-sm text-slate-500">คลิกที่รายการเพื่อเพิ่มลงตะกร้า</p>
            </div>
            <span className="text-xs text-slate-400">{filteredItems.length} รายการ</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-5">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  activeCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          {menuError ? (
            <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3 border border-red-100">
              {menuError}
            </div>
          ) : null}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            {isLoadingMenu ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                กำลังโหลดเมนู...
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => {
                  const prices = normalizePrices(item.prices)
                  const priceList = getVariantOptions(prices)
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMenuClick(item)}
                      className="group text-left rounded-xl border border-slate-100 bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-slate-800 group-hover:text-slate-900">
                          {item.name}
                        </h3>
                        {priceList.length === 1 ? (
                          <span className="text-sm font-semibold text-blue-600">฿{Number(prices[priceList[0]])}</span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">Multiple</span>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        {priceList.map((key) => (
                          <span key={`${item.id}-${key}`} className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                            {getVariantLabel(key)} ฿{Number(prices[key])}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                        <span>{item.category}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">เพิ่ม +</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-100 p-6 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">ตะกร้าสินค้า</h2>
              <p className="text-sm text-slate-500">รายการที่เลือก</p>
            </div>
            <span className="text-xs text-slate-400">{cart.length} รายการ ({totalQty} แก้ว)</span>
          </div>
          <div className="mt-6 flex-1 overflow-y-auto custom-scrollbar pr-1">
            {cart.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                ยังไม่มีสินค้าในตะกร้า
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((entry) => (
                  <div
                    key={entry.key}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{entry.displayName || entry.name}</p>
                        <p className="text-xs text-slate-500">฿{entry.price} ต่อแก้ว</p>
                        {buildCartOptionLabel(entry) ? (
                          <p className="mt-1 text-xs text-slate-500">
                            ตัวเลือก: {buildCartOptionLabel(entry)}
                          </p>
                        ) : null}
                        {entry.bringOwnCup ? (
                          <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                            นำแก้วมาเอง (-฿5)
                          </span>
                        ) : null}
                      </div>
                      <button
                        onClick={() => removeItem(entry.key)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        ลบ
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => decreaseItem(entry.key)}
                          className="h-7 w-7 rounded-full border border-slate-200 text-slate-500 hover:bg-white transition-colors"
                        >
                          -
                        </button>
                        <span className="text-sm font-semibold w-4 text-center">{entry.qty}</span>
                        <button
                          onClick={() => addToCart(entry)}
                          className="h-7 w-7 rounded-full border border-slate-200 text-slate-500 hover:bg-white transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-blue-600">฿{entry.price * entry.qty}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-shrink-0">
            <div className="mt-6 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>จำนวนทั้งหมด</span>
                <span className="font-semibold text-slate-700">{totalQty} แก้ว</span>
              </div>
              <div className="flex items-center justify-between text-base font-bold mt-2">
                <span>ยอดรวมทั้งสิ้น</span>
                <span className="text-xl text-blue-600">฿{total}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
                <span>Payment method</span>
                <span className="font-semibold text-slate-700">
                  {paymentMethod === 'CASH' ? 'Cash (เงินสด)' : 'Transfer (โอนเงิน)'}
                </span>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Payment Method</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  disabled={isSubmitting}
                  className={`rounded-xl py-3 text-sm font-semibold transition-all ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  Cash (เงินสด)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('TRANSFER')}
                  disabled={isSubmitting}
                  className={`rounded-xl py-3 text-sm font-semibold transition-all ${
                    paymentMethod === 'TRANSFER'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  Transfer (โอนเงิน)
                </button>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isManualId}
                    onChange={(event) => setIsManualId(event.target.checked)}
                    disabled={isSubmitting}
                  />
                  ระบุเลขที่บิลเอง (Manual ID)
                </label>
              </div>
              <input
                type="text"
                value={manualReceiptNo}
                onChange={(event) => setManualReceiptNo(event.target.value)}
                disabled={!isManualId || isSubmitting}
                placeholder="เช่น 1, 2, 3"
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              />
            </div>

            {status ? (
              <div className={`mt-4 rounded-lg text-sm px-4 py-3 font-medium ${status.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {status}
              </div>
            ) : null}

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isSubmitting}
              className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'คิดเงิน / ชำระเงิน'}
            </button>
          </div>
        </aside>
      </main>

      {selectedProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selectedProduct.name}</h3>
                <p className="text-sm text-slate-500">Select variant and sweetness.</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {addonError ? (
                <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {addonError}
                </div>
              ) : null}
              {isIceProduct(selectedProduct) ? (
                <div>
                  <label className="text-sm font-semibold text-slate-700">Custom Price (ระบุราคา)</label>
                  <input
                    type="number"
                    value={customPrice}
                    onChange={(event) => setCustomPrice(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    min="0"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Variant</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {getVariantOptions(selectedProduct.prices || {}).map((variant) => (
                        <button
                          key={variant}
                          onClick={() => setSelectedVariant(variant)}
                          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                            selectedVariant === variant
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {getVariantLabel(variant)} ฿{Number(selectedProduct.prices?.[variant])}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedProduct.has_sweetness !== false ? (
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Sweetness</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {['0', '25', '50', '100'].map((level) => (
                          <button
                            key={level}
                            onClick={() => setSelectedSweetness(level)}
                            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                              selectedSweetness === level
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {level}%
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={selectedBringOwnCup}
                      onChange={(event) => setSelectedBringOwnCup(event.target.checked)}
                    />
                    นำแก้วมาเอง (-฿5)
                  </label>

                  {selectedProduct.allow_roast !== false ? (
                    <div>
                      <p className="text-sm font-semibold text-slate-700">ระดับการคั่ว</p>
                      <div className="mt-2 grid gap-2">
                        {roastOptions.map((option) => (
                          <label
                            key={option.id}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                              selectedRoast === option.id
                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                : 'border-slate-200 text-slate-600'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="roast"
                                value={option.id}
                                checked={selectedRoast === option.id}
                                onChange={() => setSelectedRoast(option.id)}
                              />
                              {option.label}
                            </span>
                            <span className="text-xs font-semibold">+฿{option.price}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selectedProduct.allow_addons !== false ? (
                    <div>
                      <p className="text-sm font-semibold text-slate-700">เพิ่มเติม</p>
                      <div className="mt-2 grid gap-2">
                        {addonOptions.map((addon) => (
                          <label
                            key={addon.id}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                              selectedAddons.includes(addon.id)
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 text-slate-600'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedAddons.includes(addon.id)}
                                onChange={(event) => {
                                  const checked = event.target.checked
                                  setSelectedAddons((prev) => {
                                    if (checked) return [...prev, addon.id]
                                    return prev.filter((item) => item !== addon.id)
                                  })
                                }}
                              />
                              {addon.label}
                            </span>
                            <span className="text-xs font-semibold">+฿{addon.price}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedProduct(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmVariant}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default POS