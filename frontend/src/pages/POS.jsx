import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTransaction } from '../api/transaction'
import { getProducts } from '../api/products'

const PRICE_ORDER = ['hot', 'iced', 'frappe', 'regular']
const VARIANT_LABELS = {
  hot: 'Hot',
  iced: 'Iced',
  frappe: 'Frappe',
  regular: 'Regular'
}

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
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().slice(0, 10))

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

  const buildCartKey = (productId, variant, sweetness) => {
    return `${productId}__${variant || 'regular'}__${sweetness || 'none'}`
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

    if (options.length > 1) {
      setSelectedProduct({ ...product, prices })
      setSelectedVariant(options[0])
      setSelectedSweetness('100')
      return
    }

    const singleVariant = options[0]
    if (!singleVariant) return
    const entry = {
      key: buildCartKey(product.id, singleVariant, product.has_sweetness ? '100' : ''),
      id: product.id,
      name: product.name,
      variant: singleVariant,
      sweetness: product.has_sweetness ? '100' : '',
      price: Number(prices[singleVariant])
    }
    addToCart(entry)
  }

  const confirmVariant = () => {
    if (!selectedProduct) return
    const price = selectedProduct.prices?.[selectedVariant]
    if (price === undefined) return

    const sweetness = selectedProduct.has_sweetness ? selectedSweetness : ''
    const entry = {
      key: buildCartKey(selectedProduct.id, selectedVariant, sweetness),
      id: selectedProduct.id,
      name: selectedProduct.name,
      variant: selectedVariant,
      sweetness,
      price: Number(price)
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

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setIsSubmitting(true)
    setStatus('')
    try {
      const payload = {
        payment_method: paymentMethod,
        record_date: recordDate,
        items: cart.map((entry) => {
          const variantLabel = getVariantLabel(entry.variant)
          const nameSuffix = entry.variant ? ` (${variantLabel})` : ''
          const sweetnessSuffix = entry.sweetness ? ` - ${entry.sweetness}%` : ''
          return {
            product_id: entry.id,
            product_name: `${entry.name}`,
            quantity: entry.qty,
            unit_price: entry.price,
            product_variant: entry.variant,
            sweetness: entry.sweetness
          }
        })
      }

      await createTransaction(payload)

      setCart([])
      setStatus('✅ บันทึกยอดขายสำเร็จเรียบร้อย!')
    } catch (err) {
      setStatus('❌ เกิดข้อผิดพลาด ไม่สามารถบันทึกได้ ลองเช็ค Console ดูครับ')
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Coffee Shop</p>
            <h1 className="text-2xl font-bold">POS Register</h1>
          </div>
          {/* ✅ ย้ายช่องเลือกวันที่มาไว้ตรงนี้ */}
      <div className="hidden sm:block border-l border-slate-200 pl-6">
        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Transaction Date</label>
        <input
          type="date"
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
          className="bg-slate-50 border-none text-sm font-semibold focus:ring-0 cursor-pointer"
        />
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

      <main className="max-w-6xl mx-auto px-6 py-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-100 p-6">
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
        </section>

        <aside className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-100 p-6 flex flex-col">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">ตะกร้าสินค้า</h2>
              <p className="text-sm text-slate-500">รายการที่เลือก</p>
            </div>
            <span className="text-xs text-slate-400">{cart.length} รายการ</span>
          </div>

          <div className="mt-6 flex-1 space-y-3">
            {cart.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                ยังไม่มีสินค้าในตะกร้า
              </div>
            ) : (
              cart.map((entry) => (
                <div
                  key={entry.key}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {entry.name}
                        {entry.variant ? ` (${getVariantLabel(entry.variant)})` : ''}
                      </p>
                      <p className="text-xs text-slate-500">
                        ฿{entry.price} ต่อแก้ว
                        {entry.sweetness ? ` • ${entry.sweetness}%` : ''}
                      </p>
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
              ))
            )}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4">
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
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Record Date</h3>
            <input
              type="date"
              value={recordDate}
              onChange={(event) => setRecordDate(event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
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
                    {['25', '50', '100'].map((level) => (
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