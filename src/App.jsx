import { useEffect, useMemo, useState } from 'react'
import { ShoppingCart, Search, Plus, Trash2, LogIn, QrCode, ScanLine, PackageOpen } from 'lucide-react'

const API = import.meta.env.VITE_BACKEND_URL || ''

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)

  const login = async (email, password) => {
    const body = new URLSearchParams({ username: email, password })
    const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
    if (!res.ok) throw new Error('Login failed')
    const data = await res.json()
    localStorage.setItem('token', data.access_token)
    setToken(data.access_token)
    // Fetch user info from token is not provided, so just mark logged in
    setUser({ email })
  }
  const logout = () => { localStorage.removeItem('token'); setToken(''); setUser(null) }
  return { token, user, login, logout }
}

function Header({ onOpenAdmin }) {
  return (
    <div className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="font-bold text-xl">Grocer POS</div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={onOpenAdmin} className="px-3 py-1.5 rounded border hover:bg-gray-50 text-sm">Admin</button>
        </div>
      </div>
    </div>
  )
}

function ProductSearch({ onAdd }) {
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])

  useEffect(() => {
    const id = setTimeout(async () => {
      if (!q) { setItems([]); return }
      const res = await fetch(`${API}/products/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setItems(data)
    }, 300)
    return () => clearTimeout(id)
  }, [q])

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name or barcode" className="w-full pl-8 pr-3 py-2 border rounded"/>
        </div>
      </div>
      {items.length>0 && (
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {items.map(it => (
            <button key={it.id} onClick={()=>onAdd(it)} className="border rounded p-2 hover:bg-gray-50 text-left">
              <div className="font-medium text-sm line-clamp-2">{it.title}</div>
              <div className="text-xs text-gray-500">₹{it.price?.toFixed?.(2) || 0}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Cart({ items, setItems }) {
  const subtotal = useMemo(()=> items.reduce((s, it)=> s + it.price * it.qty, 0), [items])
  const add = (it) => setItems(prev => prev.map(p => p.id===it.id? {...p, qty: p.qty+1}: p))
  const sub = (it) => setItems(prev => prev.map(p => p.id===it.id? {...p, qty: Math.max(1, p.qty-1)}: p))
  const remove = (itId) => setItems(prev => prev.filter(p => p.id!==itId))

  return (
    <div className="border rounded p-3">
      <div className="font-semibold mb-2">Bill</div>
      <div className="space-y-2 max-h-80 overflow-auto">
        {items.map(it => (
          <div key={it.id} className="flex items-center gap-2">
            <div className="flex-1">
              <div className="text-sm">{it.title}</div>
              <div className="text-xs text-gray-500">₹{it.price.toFixed(2)}</div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={()=>sub(it)} className="px-2 py-1 border rounded">-</button>
              <div className="w-8 text-center">{it.qty}</div>
              <button onClick={()=>add(it)} className="px-2 py-1 border rounded">+</button>
            </div>
            <div className="w-16 text-right">₹{(it.qty*it.price).toFixed(2)}</div>
            <button onClick={()=>remove(it.id)} className="p-1 text-red-600"><Trash2 className="w-4 h-4"/></button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between font-medium">
        <div>Subtotal</div>
        <div>₹{subtotal.toFixed(2)}</div>
      </div>
    </div>
  )
}

function Payment({ total, token, onPaid }) {
  const [method, setMethod] = useState('cash')
  const [qr, setQr] = useState(null)

  const checkout = async () => {
    const res = await fetch(`${API}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items: onPaid.getItems(), payment_method: method })
    })
    const data = await res.json()
    if (!res.ok) { alert(data.detail || 'Checkout failed'); return }
    if (method === 'online') {
      const qrRes = await fetch(`${API}/payments/qr`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ order_id: data.order_id, amount: data.total }) })
      const qrData = await qrRes.json()
      setQr(qrData.qr)
    } else {
      onPaid()
    }
  }

  return (
    <div className="border rounded p-3 space-y-3">
      <div className="font-semibold">Payment</div>
      <div className="flex gap-2">
        <button onClick={()=>setMethod('cash')} className={`px-3 py-1.5 rounded border ${method==='cash'?'bg-black text-white':''}`}>Cash</button>
        <button onClick={()=>setMethod('online')} className={`px-3 py-1.5 rounded border ${method==='online'?'bg-black text-white':''}`}>Online</button>
      </div>
      <div className="flex items-center justify-between">
        <div>Total</div>
        <div className="text-xl font-bold">₹{total.toFixed(2)}</div>
      </div>
      <button onClick={checkout} className="w-full bg-green-600 hover:bg-green-700 text-white rounded py-2 flex items-center justify-center gap-2">
        {method==='online'? <QrCode className="w-4 h-4"/>: <PackageOpen className="w-4 h-4"/>}
        {method==='online'? 'Generate QR': 'Complete Sale'}
      </button>
      {qr && (
        <div className="text-center">
          <img src={qr} alt="payment qr" className="mx-auto w-48 h-48"/>
          <div className="text-sm text-gray-600 mt-2">Scan to pay</div>
        </div>
      )}
    </div>
  )
}

function AdminPanel({ token }) {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [barcode, setBarcode] = useState('')
  const [products, setProducts] = useState([])

  const fetchProducts = async () => {
    const res = await fetch(`${API}/products`)
    const data = await res.json()
    setProducts(data)
  }
  useEffect(()=>{ fetchProducts() }, [])

  const addProduct = async () => {
    const body = { title, price: parseFloat(price || '0'), category: 'general', stock: 100 }
    const res = await fetch(`${API}/products`, { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
    if (res.ok) { setTitle(''); setPrice(''); fetchProducts() } else { const d=await res.json(); alert(d.detail || 'Failed') }
  }

  const registerBarcode = async (productId) => {
    const res = await fetch(`${API}/products/barcode`, { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ product_id: productId, barcode }) })
    if (res.ok) { setBarcode(''); fetchProducts() } else { const d=await res.json(); alert(d.detail || 'Failed') }
  }

  return (
    <div className="space-y-4">
      <div className="font-semibold text-lg">Admin</div>
      <div className="grid sm:grid-cols-3 gap-2">
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Product title" className="border rounded px-3 py-2"/>
        <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="Price" className="border rounded px-3 py-2"/>
        <button onClick={addProduct} className="bg-black text-white rounded px-3">Add</button>
      </div>
      <div className="border rounded">
        <div className="p-3 font-medium border-b">Products</div>
        <div className="p-3 grid gap-2">
          {products.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="font-medium text-sm">{p.title}</div>
                <div className="text-xs text-gray-500">₹{p.price?.toFixed?.(2) || 0} • Stock {p.stock ?? 0}</div>
              </div>
              <input value={barcode} onChange={e=>setBarcode(e.target.value)} placeholder="Barcode" className="border rounded px-2 py-1 text-sm"/>
              <button onClick={()=>registerBarcode(p.id)} className="px-2 py-1 border rounded text-sm">Save</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const auth = useAuth()
  const [cart, setCart] = useState([])
  const [showAdmin, setShowAdmin] = useState(false)

  const addToCart = (p) => {
    setCart(prev => {
      const f = prev.find(x => x.id===p.id)
      if (f) return prev.map(x => x.id===p.id? {...x, qty: x.qty+1}: x)
      return [...prev, { id:p.id, title:p.title, price:p.price || 0, qty:1 }]
    })
  }

  const getItems = () => cart.map(c => ({ product_id: c.id, title: c.title, quantity: c.qty, price: c.price }))

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onOpenAdmin={() => setShowAdmin(v=>!v)} />

      <div className="max-w-5xl mx-auto p-4 grid md:grid-cols-2 gap-4">
        {!auth.token ? (
          <div className="border rounded p-4 space-y-3">
            <div className="font-semibold flex items-center gap-2"><LogIn className="w-4 h-4"/> Login</div>
            <LoginForm onLogin={auth.login} />
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <ProductSearch onAdd={addToCart} />
              <Cart items={cart} setItems={setCart} />
            </div>
            <div className="space-y-4">
              <Payment total={cart.reduce((s,c)=>s+c.price*c.qty,0)} token={auth.token} onPaid={() => { alert('Sale completed'); setCart([]) }} getItems={getItems} />
              {showAdmin && <AdminPanel token={auth.token} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    try { await onLogin(email, password) } catch (e) { alert(e.message) }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-3 py-2"/>
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full border rounded px-3 py-2"/>
      <button className="w-full bg-black text-white rounded py-2">Login</button>
    </form>
  )
}
