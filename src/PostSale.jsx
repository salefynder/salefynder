import { useState } from 'react'
import { supabase } from './supabaseClient'
import './PostSale.css'

function PostSale({ onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    description: '',
    date_start: '',
    date_end: ''
  })
  const [items, setItems] = useState([{ name: '', category: '', price: '' }])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleItemChange = (index, e) => {
    const updated = [...items]
    updated[index][e.target.name] = e.target.value
    setItems(updated)
  }

  const addItem = () => {
    setItems([...items, { name: '', category: '', price: '' }])
  }

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([formData])
        .select()
        .single()

      if (saleError) throw saleError

      const itemsToInsert = items
        .filter(item => item.name.trim() !== '')
        .map(item => ({ ...item, sale_id: sale.id }))

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('items')
          .insert(itemsToInsert)
        if (itemsError) throw itemsError
      }

      setSuccess(true)
      setFormData({
        title: '', address: '', city: '', state: '',
        zip: '', description: '', date_start: '', date_end: ''
      })
      setItems([{ name: '', category: '', price: '' }])

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="post-sale-overlay">
      <div className="post-sale-page">
        <header className="header">
          <div className="header-inner">
            <h1 className="logo">SaleFynder</h1>
            <p className="tagline">Post your sale for free</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </header>

        <div className="form-container">
          <h2>List Your Sale</h2>
          <p className="form-subtitle">Fill in the details below and shoppers in your area will find you.</p>

          {success && (
            <div className="success-message">
              🎉 Your sale has been posted! Shoppers in your area can now find it.
            </div>
          )}

          {error && (
            <div className="error-message">
              Something went wrong: {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Sale Details</h3>

              <div className="form-group">
                <label>Sale Title</label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Moving Sale — Everything Must Go"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  placeholder="Tell shoppers what to expect..."
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    name="date_start"
                    value={formData.date_start}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    name="date_end"
                    value={formData.date_end}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Location</h3>

              <div className="form-group">
                <label>Street Address</label>
                <input
                  type="text"
                  name="address"
                  placeholder="123 Main Street"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    name="city"
                    placeholder="Eugene"
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group form-group-small">
                  <label>State</label>
                  <input
                    type="text"
                    name="state"
                    placeholder="OR"
                    value={formData.state}
                    onChange={handleChange}
                    required
                    maxLength={2}
                  />
                </div>
                <div className="form-group form-group-small">
                  <label>Zip Code</label>
                  <input
                    type="text"
                    name="zip"
                    placeholder="97401"
                    value={formData.zip}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Items for Sale</h3>
              <p className="section-subtitle">List specific items so shoppers can find exactly what they're looking for.</p>

              {items.map((item, index) => (
                <div key={index} className="item-row">
                  <input
                    type="text"
                    name="name"
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => handleItemChange(index, e)}
                  />
                  <select
                    name="category"
                    value={item.category}
                    onChange={(e) => handleItemChange(index, e)}
                  >
                    <option value="">Category</option>
                    <option value="furniture">Furniture</option>
                    <option value="clothing">Clothing</option>
                    <option value="electronics">Electronics</option>
                    <option value="kitchen">Kitchen</option>
                    <option value="tools">Tools</option>
                    <option value="toys">Toys</option>
                    <option value="books">Books</option>
                    <option value="antiques">Antiques</option>
                    <option value="jewelry">Jewelry</option>
                    <option value="sports">Sports</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="number"
                    name="price"
                    placeholder="Price $"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, e)}
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      className="remove-item"
                      onClick={() => removeItem(index)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <button type="button" className="add-item-btn" onClick={addItem}>
                + Add Another Item
              </button>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Posting your sale...' : 'Post My Sale for Free'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PostSale