import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './PostSale.css'

const VALID_CATEGORIES = ['furniture','clothing','electronics','kitchen','tools','toys','books','antiques','jewelry','sports','other']

const HEADER_MAP = {
  name:     ['item', 'item name', 'name', 'product', 'title', 'description'],
  category: ['category', 'type', 'cat', 'kind', 'department']
}

const parseLine = (line) => {
  const cols = []; let cur = '', inQuotes = false
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes
    else if (ch === ',' && !inQuotes) { cols.push(cur.trim()); cur = '' }
    else cur += ch
  }
  cols.push(cur.trim())
  return cols
}

const levenshtein = (a, b) => {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  )
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[a.length][b.length]
}

const resolveCategory = (raw) => {
  const s = raw.trim().toLowerCase()
  if (!s) return { category: 'other', _categoryFuzzy: true }
  if (VALID_CATEGORIES.includes(s)) return { category: s, _categoryFuzzy: false }
  let bestCat = 'other', bestDist = Infinity
  for (const cat of VALID_CATEGORIES) {
    const d = levenshtein(s, cat)
    if (d < bestDist) { bestDist = d; bestCat = cat }
  }
  return { category: bestDist <= 2 ? bestCat : 'other', _categoryFuzzy: true }
}

const parseCSV = (text) => {
  const lines = text.split(/\r?\n/)
  if (!lines[0]?.trim()) return { error: 'The file appears to be empty.' }
  const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim())
  const colMap = headers.map(h => {
    for (const [field, variants] of Object.entries(HEADER_MAP)) {
      if (variants.includes(h)) return field
    }
    return null
  })
  if (!colMap.includes('name')) return { error: 'Could not find an Item Name column. Check your headers and try again.' }
  const nameIdx = colMap.indexOf('name')
  const catIdx = colMap.indexOf('category')
  const dataLines = lines.slice(1).filter(l => l.trim())
  if (!dataLines.length) return { error: 'No items found in the CSV.' }
  const items = dataLines.map(line => {
    const cols = parseLine(line)
    const name = cols[nameIdx]?.trim() || ''
    const rawCat = catIdx >= 0 ? (cols[catIdx]?.trim() || '') : ''
    const { category, _categoryFuzzy } = resolveCategory(rawCat)
    return { name, category, _categoryFuzzy, _skipped: !name }
  })
  if (items.every(i => i._skipped)) return { error: 'No valid items found — every row is missing an item name.' }
  return { items }
}

function BulkPostSale({ onClose, onSwitchToStandard, userLocation }) {
  const [step, setStep] = useState('sale-info')
  const [formData, setFormData] = useState({
    title: '', address: '', city: '', state: '', zip: '', description: '', date_start: '', date_end: ''
  })
  const [detectedCity, setDetectedCity] = useState(null)
  const [saleInfoError, setSaleInfoError] = useState(null)
  const [parsedItems, setParsedItems] = useState([])
  const [uploadError, setUploadError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    if (!userLocation) return
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${userLocation.lat}&lon=${userLocation.lng}&format=json`,
      { headers: { 'User-Agent': 'SaleFynder/1.0' } }
    )
      .then(r => r.json())
      .then(data => {
        const city = data.address?.city || data.address?.town || data.address?.village
        if (city) setDetectedCity(city)
      })
      .catch(() => {})
  }, [])

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const geocodeAddress = async ({ address, city, state, zip }) => {
    const query = encodeURIComponent(`${address}, ${city}, ${state} ${zip}`)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      { headers: { 'User-Agent': 'SaleFynder/1.0' } }
    )
    const results = await res.json()
    if (!results.length) throw new Error('Address not found. Please check your address and try again.')
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
  }

  const handleSaleInfoContinue = () => {
    const { title, address, city, state, zip, date_start, date_end } = formData
    if (!title.trim() || !address.trim() || !city.trim() || !state.trim() || !zip.trim() || !date_start || !date_end) {
      setSaleInfoError('Please fill in all required fields before continuing.')
      return
    }
    setSaleInfoError(null)
    setStep('upload')
  }

  const handleTemplateDownload = () => {
    const csv = 'Item Name,Category\nOak dining table,furniture\nVintage floor lamp,other\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'salefynder-items-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const result = parseCSV(evt.target.result)
      if (result.error) {
        setUploadError(result.error)
      } else {
        setParsedItems(result.items)
        setUploadError(null)
        setStep('preview')
      }
    }
    reader.readAsText(file)
  }

  const handleCategoryOverride = (index, newCategory) => {
    setParsedItems(prev => prev.map((item, i) =>
      i === index ? { ...item, category: newCategory, _categoryFuzzy: false } : item
    ))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const { lat, lng } = await geocodeAddress(formData)
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{ ...formData, lat, lng }])
        .select()
        .single()
      if (saleError) throw saleError
      const itemsToInsert = parsedItems
        .filter(i => !i._skipped)
        .map(({ name, category }) => ({ name, category, sale_id: sale.id }))
      const { error: itemsError } = await supabase.from('items').insert(itemsToInsert)
      if (itemsError) throw itemsError
      setStep('success')
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const validCount = parsedItems.filter(i => !i._skipped).length
  const skippedCount = parsedItems.filter(i => i._skipped).length
  const fuzzyCount = parsedItems.filter(i => !i._skipped && i._categoryFuzzy).length

  return (
    <div className="post-sale-overlay">
      <div className="post-sale-page">
        <header className="header">
          <div className="header-inner">
            <h1 className="logo">Sale<span className="logo-highlight">Fynder</span></h1>
            <p className="tagline">Post your sale for free</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </header>

        <div className="form-container">
          {step === 'sale-info' && (
            <div>
              <h2>List Your Sale</h2>
              <p className="form-subtitle">Fill in the details below, then upload your item list as a CSV file.</p>

              {saleInfoError && <div className="error-message">{saleInfoError}</div>}

              <div className="form-section">
                <h3>Sale Details</h3>
                <div className="form-group">
                  <label>Sale Title</label>
                  <input type="text" name="title" placeholder="e.g. Moving Sale — Everything Must Go" value={formData.title} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" placeholder="Tell shoppers what to expect..." value={formData.description} onChange={handleChange} rows={3} />
                </div>
                <div className="form-row form-row-dates">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" name="date_start" value={formData.date_start} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input type="date" name="date_end" value={formData.date_end} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Location</h3>
                <div className="form-group">
                  <label>Street Address</label>
                  <input type="text" name="address" placeholder="123 Main Street" value={formData.address} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input type="text" name="city" placeholder={detectedCity || 'Eugene'} value={formData.city} onChange={handleChange} />
                </div>
                <div className="state-zip-row">
                  <div className="form-group form-group-small">
                    <label>State</label>
                    <input type="text" name="state" placeholder="OR" value={formData.state} onChange={handleChange} maxLength={2} />
                  </div>
                  <div className="form-group form-group-small">
                    <label>Zip Code</label>
                    <input type="text" name="zip" placeholder="97401" value={formData.zip} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <button className="submit-btn" onClick={handleSaleInfoContinue}>Continue to Item Upload</button>
            </div>
          )}

          {step === 'upload' && (
            <div>
              <h2>Upload Your Items</h2>
              <p className="form-subtitle">Download the template, fill it in, then upload it here.</p>

              <div className="form-section">
                <h3>Step 1: Get the template</h3>
                <p className="section-subtitle">Open in Excel or Google Sheets and fill in your items.</p>
                <button type="button" className="bulk-template-btn" onClick={handleTemplateDownload}>
                  Download CSV Template
                </button>
              </div>

              <div className="form-section">
                <h3>Step 2: Upload your completed file</h3>
                {uploadError && <div className="error-message">{uploadError}</div>}
                <label className="bulk-csv-label">
                  Choose CSV file
                  <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>

              <button type="button" className="bulk-back-btn" onClick={() => setStep('sale-info')}>Back</button>
            </div>
          )}

          {step === 'preview' && (
            <div>
              <h2>Review Your Items</h2>
              <p className="form-subtitle">Check the list below, then post your sale.</p>

              <div className="bulk-preview-summary">
                {[
                  `${validCount} item${validCount !== 1 ? 's' : ''} ready`,
                  skippedCount > 0 && `${skippedCount} skipped`,
                  fuzzyCount > 0 && `${fuzzyCount} ${fuzzyCount === 1 ? 'category needs' : 'categories need'} review`
                ].filter(Boolean).join(' · ')}
              </div>

              {submitError && <div className="error-message">{submitError}</div>}

              <div className="form-section">
                <table className="bulk-preview-table">
                  <thead>
                    <tr><th>#</th><th>Item Name</th><th>Category</th></tr>
                  </thead>
                  <tbody>
                    {parsedItems.map((item, i) => (
                      <tr key={i} className={item._skipped ? 'preview-row-skipped' : ''}>
                        <td>{i + 1}</td>
                        {item._skipped ? (
                          <td colSpan={2} className="preview-skip-note">Skipped — no item name</td>
                        ) : (
                          <>
                            <td>{item.name}</td>
                            <td className={item._categoryFuzzy ? 'preview-cell-fuzzy' : ''}>
                              {item._categoryFuzzy ? (
                                <select value={item.category} onChange={e => handleCategoryOverride(i, e.target.value)}>
                                  {VALID_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                  ))}
                                </select>
                              ) : (
                                item.category.charAt(0).toUpperCase() + item.category.slice(1)
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button className="submit-btn" onClick={handleSubmit} disabled={submitting || validCount === 0}>
                {submitting ? 'Posting your sale...' : 'Post My Sale'}
              </button>
              <button type="button" className="bulk-back-btn" onClick={() => setStep('upload')}>Back</button>
            </div>
          )}

          {step === 'success' && (
            <div>
              <h2>Your sale is live!</h2>
              <p className="form-subtitle">Shoppers in your area can now find it.</p>
              <div className="success-message">
                {validCount} item{validCount !== 1 ? 's' : ''} posted successfully. Use the close button above when you're done.
              </div>
            </div>
          )}

          {step !== 'success' && (
            <p style={{ marginTop: '16px', fontSize: '13px', color: '#888' }}>
              Have only a few items?{' '}
              <button
                type="button"
                style={{ background: 'none', border: 'none', padding: 0, color: '#555', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}
                onClick={onSwitchToStandard}
              >
                Use the standard form instead
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default BulkPostSale
