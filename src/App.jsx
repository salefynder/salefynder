import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import './App.css'
import PostSale from './PostSale'
import { supabase } from './supabaseClient'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 3958.8
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [radius, setRadius] = useState(10)
  const [selectedSale, setSelectedSale] = useState(null)
  const [sales, setSales] = useState([])
  const [displayedSales, setDisplayedSales] = useState([])
  const [showPostSale, setShowPostSale] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [searchNote, setSearchNote] = useState(null)
  const [searchActive, setSearchActive] = useState(false)

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('*, items(*)')

    if (error) {
      console.error('Error fetching sales:', error)
    } else {
      setSales(data)
      setDisplayedSales(data)
      setSearchActive(false)
      setSearchNote(null)
    }
  }

  useEffect(() => {
    fetchSales()
  }, [])

  const getUserLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('unavailable'))
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('denied'))
    )
  })

  const handleSearch = async (e) => {
    e.preventDefault()
    const term = searchTerm.trim()
    if (!term) return

    const isZip = /^\d{5}$/.test(term)

    if (isZip) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(term)}&format=json&limit=1&countrycodes=us`,
          { headers: { 'User-Agent': 'SaleFynder/1.0' } }
        )
        const results = await res.json()
        if (!results.length) {
          setSearchNote('Zip code not found. Please try again.')
          return
        }
        // local variable only — zip searches never overwrite cached userLocation
        const center = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
        const filtered = sales.filter(sale => {
          if (!sale.lat || !sale.lng) return false
          return haversineDistance(center.lat, center.lng, sale.lat, sale.lng) <= Number(radius)
        })
        setDisplayedSales(filtered)
        setSearchNote(null)
        setSearchActive(true)
      } catch {
        setSearchNote('Could not look up that zip code. Please try again.')
      }
    } else {
      const termRegex = new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')
      let center = userLocation
      if (!center) {
        try {
          center = await getUserLocation()
          setUserLocation(center)
        } catch {
          const filtered = sales.filter(sale =>
            sale.items?.some(item =>
              termRegex.test(item.name) ||
              termRegex.test(item.category)
            )
          )
          setDisplayedSales(filtered)
          setSearchNote('Location access was needed for radius filtering. Showing all sales with matching items.')
          setSearchActive(true)
          return
        }
      }
      const filtered = sales.filter(sale => {
        const hasKeyword = sale.items?.some(item =>
          termRegex.test(item.name) ||
          termRegex.test(item.category)
        )
        if (!hasKeyword) return false
        if (!sale.lat || !sale.lng) return false
        return haversineDistance(center.lat, center.lng, sale.lat, sale.lng) <= Number(radius)
      })
      setDisplayedSales(filtered)
      setSearchNote(null)
      setSearchActive(true)
    }
  }

  const clearSearch = () => {
    setSearchTerm('')
    setDisplayedSales(sales)
    setSearchNote(null)
    setSearchActive(false)
  }

  return (
    <div className="app">
      {showPostSale && (
        <PostSale
          onClose={() => {
            setShowPostSale(false)
            fetchSales()
          }}
        />
      )}

      <header className="header">
        <div className="header-inner">
          <h1 className="logo">SaleFynder</h1>
          <p className="tagline">Find every garage sale, yard sale & estate sale near you</p>
        </div>
      </header>

      <div className="search-bar">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search for items or enter your zip code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="radius-select"
          >
            <option value={5}>5 miles</option>
            <option value={10}>10 miles</option>
            <option value={25}>25 miles</option>
            <option value={50}>50 miles</option>
          </select>
          <button type="submit" className="search-button">Search</button>
          {searchActive && (
            <button type="button" className="clear-button" onClick={clearSearch}>Clear</button>
          )}
        </form>
        {searchNote && <p className="search-note">{searchNote}</p>}
      </div>

      <div className="main-content">
        <div className="map-container">
          <MapContainer
            center={[44.0521, -123.0868]}
            zoom={11}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {displayedSales
              .filter(sale => sale.lat && sale.lng)
              .map(sale => (
                <Marker
                  key={sale.id}
                  position={[sale.lat, sale.lng]}
                  eventHandlers={{
                    click: () => setSelectedSale(sale)
                  }}
                >
                  <Popup>
                    <strong>{sale.title}</strong><br />
                    {sale.address}<br />
                    {sale.date_start} – {sale.date_end}
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>

        <div className="listings-panel">
          <h2>Sales near you</h2>
          <p className="results-count">{displayedSales.length} sales found</p>
          {displayedSales.length === 0 && (
            <p className="empty-state">
              {searchActive ? 'No sales match your search.' : 'No sales posted yet. Be the first!'}
            </p>
          )}
          {displayedSales.map(sale => (
            <div
              key={sale.id}
              className={`sale-card ${selectedSale?.id === sale.id ? 'sale-card-active' : ''}`}
              onClick={() => setSelectedSale(sale)}
            >
              <h3>{sale.title}</h3>
              <p className="sale-address">{sale.address}, {sale.city}, {sale.state}</p>
              <p className="sale-date">{sale.date_start} – {sale.date_end}</p>
              <div className="sale-tags">
                {sale.items && sale.items.map(item => (
                  <span key={item.id} className="tag">{item.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="post-cta">
        <h2>Hosting a sale?</h2>
        <p>List it free on SaleFynder and reach hundreds of local shoppers.</p>
        <button className="post-button" onClick={() => setShowPostSale(true)}>Post Your Sale</button>
      </div>
    </div>
  )
}

export default App
