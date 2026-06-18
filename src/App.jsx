import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import './App.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const SAMPLE_SALES = [
  {
    id: 1,
    title: "Moving Sale — Everything Must Go",
    address: "1234 Oak Street, Eugene, OR",
    date: "Sat–Sun, Jun 21–22",
    items: ["furniture", "kitchen", "tools"],
    lat: 44.0521,
    lng: -123.0868
  },
  {
    id: 2,
    title: "Estate Sale — Antiques & Collectibles",
    address: "567 Willow Ave, Springfield, OR",
    date: "Sat, Jun 21",
    items: ["antiques", "jewelry", "books"],
    lat: 44.0462,
    lng: -123.0220
  },
  {
    id: 3,
    title: "Garage Sale — Kids & Baby Items",
    address: "890 Maple Dr, Eugene, OR",
    date: "Sun, Jun 22",
    items: ["baby gear", "toys", "clothing"],
    lat: 44.0650,
    lng: -123.1200
  }
]

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [radius, setRadius] = useState(10)
  const [selectedSale, setSelectedSale] = useState(null)

  const handleSearch = (e) => {
    e.preventDefault()
    console.log('Searching for:', searchTerm, 'within', radius, 'miles')
  }

  return (
    <div className="app">

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
            {SAMPLE_SALES.map(sale => (
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
                  {sale.date}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="listings-panel">
          <h2>Sales near you</h2>
          <p className="results-count">{SAMPLE_SALES.length} sales found</p>
          {SAMPLE_SALES.map(sale => (
            <div
              key={sale.id}
              className={`sale-card ${selectedSale?.id === sale.id ? 'sale-card-active' : ''}`}
              onClick={() => setSelectedSale(sale)}
            >
              <h3>{sale.title}</h3>
              <p className="sale-address">{sale.address}</p>
              <p className="sale-date">{sale.date}</p>
              <div className="sale-tags">
                {sale.items.map(item => (
                  <span key={item} className="tag">{item}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="post-cta">
        <h2>Hosting a sale?</h2>
        <p>List it free on SaleFynder and reach hundreds of local shoppers.</p>
        <button className="post-button">Post Your Sale</button>
      </div>

    </div>
  )
}

export default App