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

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [radius, setRadius] = useState(10)
  const [selectedSale, setSelectedSale] = useState(null)
  const [sales, setSales] = useState([])
  const [showPostSale, setShowPostSale] = useState(false)

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('*, items(*)')

    if (error) {
      console.error('Error fetching sales:', error)
    } else {
      setSales(data)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    console.log('Searching for:', searchTerm, 'within', radius, 'miles')
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
        </form>
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
            {sales
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
          <p className="results-count">{sales.length} sales found</p>
          {sales.length === 0 && (
            <p className="empty-state">No sales posted yet. Be the first!</p>
          )}
          {sales.map(sale => (
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