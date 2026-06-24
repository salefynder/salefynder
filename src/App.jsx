import { useState, useEffect, useRef, useMemo } from 'react'
import { Map, Marker, Popup, Source, Layer } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import './App.css'
import PostSale from './PostSale'
import BulkPostSale from './BulkPostSale'
import RoutePanel from './RoutePanel'
import { supabase } from './supabaseClient'

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${month}/${day}/${year}`
}

const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 3958.8
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

const nearestNeighbor = (stops, origin) => {
  const remaining = [...stops]
  const result = []
  let cur = origin
  while (remaining.length) {
    let best = 0
    let bestDist = haversineDistance(cur.lat, cur.lng, remaining[0].lat, remaining[0].lng)
    for (let i = 1; i < remaining.length; i++) {
      const d = haversineDistance(cur.lat, cur.lng, remaining[i].lat, remaining[i].lng)
      if (d < bestDist) { bestDist = d; best = i }
    }
    result.push(...remaining.splice(best, 1))
    cur = result[result.length - 1]
  }
  return result.map(s => s.id)
}

const computeRouteSort = (mode, stops, loc) => {
  if (mode === 'optimized') return nearestNeighbor(stops, loc)
  const sorted = [...stops].sort((a, b) => {
    const da = haversineDistance(loc.lat, loc.lng, a.lat, a.lng)
    const db = haversineDistance(loc.lat, loc.lng, b.lat, b.lng)
    return mode === 'near-to-far' ? da - db : db - da
  })
  return sorted.map(s => s.id)
}

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [radius, setRadius] = useState(10)
  const [selectedSale, setSelectedSale] = useState(null)
  const [sales, setSales] = useState([])
  const [displayedSales, setDisplayedSales] = useState([])
  const [postSaleView, setPostSaleView] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [searchNote, setSearchNote] = useState(null)
  const [searchActive, setSearchActive] = useState(false)
  const [mobileView, setMobileView] = useState('map')
  const [routeSelection, setRouteSelection] = useState(new Set())
  const [routeMode, setRouteMode] = useState(false)
  const [routeOrder, setRouteOrder] = useState([])
  const [routeGeometry, setRouteGeometry] = useState(null)
  const [routeLegs, setRouteLegs] = useState([])
  const [routeFetching, setRouteFetching] = useState(false)
  const [routeError, setRouteError] = useState(null)
  const [routeSortNote, setRouteSortNote] = useState(null)

  const mapRef = useRef()

  const routeStops = useMemo(
    () => routeOrder.map(id => sales.find(s => s.id === id)).filter(Boolean),
    [routeOrder, sales]
  )

  const routeStopSetKey = useMemo(
    () => [...routeOrder].sort().join(','),
    [routeOrder]
  )

  const fittedStopSetKeyRef = useRef(null)

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

  useEffect(() => {
    if (!routeMode || routeStops.length < 2) {
      setRouteGeometry(null)
      setRouteLegs([])
      return
    }
    const timer = setTimeout(async () => {
      setRouteFetching(true)
      setRouteError(null)
      try {
        const origin = userLocation ? `${userLocation.lng},${userLocation.lat};` : ''
        const coords = origin + routeStops.map(s => `${s.lng},${s.lat}`).join(';')
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&steps=false&access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`
        const res = await fetch(url)
        const data = await res.json()
        if (!data.routes?.length) throw new Error('no_route')
        setRouteGeometry(data.routes[0].geometry)
        setRouteLegs(data.routes[0].legs)
      } catch (err) {
        setRouteError(err.message === 'no_route'
          ? 'No route found between these stops.'
          : 'Could not fetch directions.')
        setRouteGeometry(null)
        setRouteLegs([])
      } finally {
        setRouteFetching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [routeStops, routeMode, userLocation])

  useEffect(() => {
    if (!routeGeometry || !mapRef.current) return
    if (routeStopSetKey === fittedStopSetKeyRef.current) return
    if (window.matchMedia('(max-width: 768px)').matches && mobileView !== 'map') return
    fittedStopSetKeyRef.current = routeStopSetKey
    const coords = routeGeometry.coordinates
    const lngs = coords.map(c => c[0])
    const lats = coords.map(c => c[1])
    mapRef.current.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 80, duration: 800 }
    )
  }, [routeGeometry, mobileView])

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

  const toggleRouteSelection = (id) => {
    setRouteSelection(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    if (routeMode) {
      setRouteOrder(prev =>
        prev.includes(id)
          ? prev.filter(stopId => stopId !== id)
          : [...prev, id]
      )
    }
  }

  const clearRouteSelection = () => setRouteSelection(new Set())

  const enterRouteMode = () => {
    const ordered = displayedSales
      .filter(sale => routeSelection.has(sale.id))
      .map(sale => sale.id)
    setRouteOrder(ordered)
    setRouteMode(true)
    setMobileView('list')
  }

  const exitRouteMode = () => {
    setRouteMode(false)
    setRouteOrder([])
    setRouteGeometry(null)
    setRouteLegs([])
    setRouteFetching(false)
    setRouteError(null)
    setRouteSortNote(null)
    fittedStopSetKeyRef.current = null
  }

  const applyRouteSort = async (mode) => {
    let loc = userLocation
    if (!loc) {
      try {
        loc = await getUserLocation()
        setUserLocation(loc)
      } catch {
        setRouteSortNote('Location access is needed to sort stops by distance. Please enable location and try again.')
        return
      }
    }
    setRouteSortNote(null)
    setRouteOrder(computeRouteSort(mode, routeStops, loc))
  }

  const removeStop = (id) => {
    setRouteOrder(prev => {
      const next = prev.filter(stopId => stopId !== id)
      if (next.length === 0) setRouteMode(false)
      return next
    })
    setRouteSelection(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  return (
    <div className="app">
      {postSaleView === 'standard' && (
        <PostSale
          onClose={() => { setPostSaleView(null); fetchSales() }}
          onSwitchToBulk={() => setPostSaleView('bulk')}
          userLocation={userLocation}
        />
      )}
      {postSaleView === 'bulk' && (
        <BulkPostSale
          onClose={() => { setPostSaleView(null); fetchSales() }}
          onSwitchToStandard={() => setPostSaleView('standard')}
          userLocation={userLocation}
        />
      )}

      <header className="header">
        <div className="header-inner">
          <h1 className="logo">Sale<span className="logo-highlight">Fynder</span></h1>
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

      <div className="mobile-tabs">
        <button
          className={`mobile-tab${mobileView === 'map' ? ' mobile-tab-active' : ''}`}
          onClick={() => setMobileView('map')}
        >Map</button>
        <button
          className={`mobile-tab${mobileView === 'list' ? ' mobile-tab-active' : ''}`}
          onClick={() => setMobileView('list')}
        >List</button>
      </div>

      <div className="main-content">
        <div className={`map-container${mobileView === 'list' ? ' mobile-hidden' : ''}`}>
          <Map
            ref={mapRef}
            initialViewState={{ longitude: -123.0868, latitude: 44.0521, zoom: 11 }}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
            onClick={() => setSelectedSale(null)}
            onLoad={(e) => e.target.resize()}
          >
            {routeGeometry && (
              <Source id="route" type="geojson" data={{ type: 'Feature', geometry: routeGeometry }}>
                <Layer
                  id="route-casing"
                  type="line"
                  layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                  paint={{ 'line-color': '#111111', 'line-width': 6 }}
                />
                <Layer
                  id="route-line"
                  type="line"
                  layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                  paint={{ 'line-color': '#FFBA08', 'line-width': 4 }}
                />
              </Source>
            )}
            {displayedSales
              .filter(sale => sale.lat && sale.lng)
              .map(sale => (
                <Marker
                  key={sale.id}
                  latitude={sale.lat}
                  longitude={sale.lng}
                  onClick={(e) => { e.originalEvent.stopPropagation(); setSelectedSale(sale) }}
                >
                  <div className={`map-pin${selectedSale?.id === sale.id ? ' map-pin-active' : ''}${routeSelection.has(sale.id) ? ' map-pin-route' : ''}`} />
                  {routeMode && routeGeometry && routeStops.length >= 1 && routeStops[routeStops.length - 1]?.id === sale.id && (
                    <div className="map-pin-end-check" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
                  )}
                </Marker>
              ))}
            {routeMode && userLocation && routeGeometry && (
              <Marker latitude={userLocation.lat} longitude={userLocation.lng}>
                <div className="map-pin-location" />
              </Marker>
            )}
            {selectedSale && (
              <Popup
                latitude={selectedSale.lat}
                longitude={selectedSale.lng}
                onClose={() => setSelectedSale(null)}
                closeOnClick={false}
                anchor="bottom"
              >
                <strong>{selectedSale.title}</strong><br />
                {selectedSale.address}<br />
                {formatDate(selectedSale.date_start)} – {formatDate(selectedSale.date_end)}
                <button
                  className="popup-route-btn"
                  onClick={() => toggleRouteSelection(selectedSale.id)}
                >
                  {routeSelection.has(selectedSale.id) ? '✓ Remove from Route' : '+ Add to Route'}
                </button>
                <button
                  className="popup-directions-btn"
                  onClick={() => {
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
                    const url = isIOS
                      ? `https://maps.apple.com/?daddr=${selectedSale.lat},${selectedSale.lng}`
                      : `https://www.google.com/maps/dir/?api=1&destination=${selectedSale.lat},${selectedSale.lng}&travelmode=driving`
                    window.open(url, '_blank')
                  }}
                >
                  Get Directions
                </button>
              </Popup>
            )}
          </Map>
        </div>

        <div className={`listings-panel${mobileView === 'map' ? ' mobile-hidden' : ''}`}>
          {routeMode ? (
            <RoutePanel
              stops={routeStops}
              onReorder={setRouteOrder}
              onRemoveStop={removeStop}
              fetching={routeFetching}
              error={routeError}
              legs={routeLegs}
              onSort={applyRouteSort}
              sortNote={routeSortNote}
              hasOriginLeg={routeLegs.length > 0 && routeLegs.length === routeStops.length}
            />
          ) : (
            <div className="listings-scroll">
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
                  className={`sale-card${selectedSale?.id === sale.id ? ' sale-card-active' : ''}${routeSelection.has(sale.id) ? ' sale-card-route' : ''}`}
                  onClick={() => setSelectedSale(sale)}
                >
                  <button
                    className={`route-checkbox${routeSelection.has(sale.id) ? ' route-checkbox-active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleRouteSelection(sale.id) }}
                    title={routeSelection.has(sale.id) ? 'Remove from route' : 'Add to route'}
                  />
                  <h3>{sale.title}</h3>
                  <p className="sale-address">{sale.address}, {sale.city}, {sale.state}</p>
                  <p className="sale-date">{formatDate(sale.date_start)} – {formatDate(sale.date_end)}</p>
                  <div className="sale-tags">
                    {sale.items && sale.items.map(item => (
                      <span key={item.id} className="tag">{item.name}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {routeSelection.size > 0 && (
            <div className="route-bar">
              {routeMode ? (
                <>
                  <span>Route: {routeOrder.length} stop{routeOrder.length !== 1 ? 's' : ''}</span>
                  <button className="route-bar-clear" onClick={exitRouteMode}>Exit</button>
                </>
              ) : (
                <>
                  <span>{routeSelection.size} stop{routeSelection.size !== 1 ? 's' : ''} selected</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="route-bar-clear" onClick={clearRouteSelection}>Clear</button>
                    <button className="route-bar-plan" onClick={enterRouteMode}>Plan Route</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {routeSelection.size > 0 && (
        <div className="route-bar route-bar-mobile">
          {routeMode ? (
            <>
              <span>Route: {routeOrder.length} stop{routeOrder.length !== 1 ? 's' : ''}</span>
              <button className="route-bar-clear" onClick={exitRouteMode}>Exit</button>
            </>
          ) : (
            <>
              <span>{routeSelection.size} stop{routeSelection.size !== 1 ? 's' : ''} selected</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="route-bar-clear" onClick={clearRouteSelection}>Clear</button>
                <button className="route-bar-plan" onClick={enterRouteMode}>Plan Route</button>
              </div>
            </>
          )}
        </div>
      )}

      <button className={`fab${routeSelection.size > 0 ? ' fab-route-active' : ''}`} onClick={() => setPostSaleView('standard')}>+ Post</button>

      <div className="post-cta">
        <h2>Hosting a sale?</h2>
        <p>List it free on SaleFynder and reach hundreds of local shoppers.</p>
        <button className="post-button" onClick={() => setPostSaleView('standard')}>Post Your Sale</button>
      </div>
    </div>
  )
}

export default App
