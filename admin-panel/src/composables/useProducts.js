import { ref } from 'vue'
import { apiBase } from '../utils/api.js'

const products = ref([])
const loading = ref(false)
const error = ref(null)

export function useProducts() {
  function getHeaders() {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
  }

  async function fetchProducts() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${apiBase}/api/products`)
      const data = await res.json()
      if (data.success) {
        products.value = data.data
      } else {
        error.value = data.message || 'Failed to load products'
      }
    } catch {
      error.value = 'Network error'
    } finally {
      loading.value = false
    }
  }

  async function createProduct(payload) {
    const res = await fetch(`${apiBase}/api/products`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (data.success) await fetchProducts()
    return { success: data.success, message: data.message }
  }

  async function updateProduct(id, payload) {
    const res = await fetch(`${apiBase}/api/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (data.success) await fetchProducts()
    return { success: data.success, message: data.message }
  }

  async function deleteProduct(id) {
    const res = await fetch(`${apiBase}/api/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    const data = await res.json()
    if (data.success) await fetchProducts()
    return { success: data.success, message: data.message }
  }

  return { products, loading, error, fetchProducts, createProduct, updateProduct, deleteProduct }
}
