import { ref } from 'vue'
import { apiBase } from '../utils/api.js'

const categories = ref([])
const loading = ref(false)
const error = ref(null)

export function useCategories() {
  function getHeaders() {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
  }

  async function fetchCategories() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${apiBase}/api/categories`)
      const data = await res.json()
      if (data.success) {
        categories.value = data.data
      } else {
        error.value = data.message || 'Failed to load categories'
      }
    } catch {
      error.value = 'Network error'
    } finally {
      loading.value = false
    }
  }

  async function createCategory(payload) {
    const res = await fetch(`${apiBase}/api/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (data.success) await fetchCategories()
    return { success: data.success, message: data.message }
  }

  async function updateCategory(id, payload) {
    const res = await fetch(`${apiBase}/api/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (data.success) await fetchCategories()
    return { success: data.success, message: data.message }
  }

  async function deleteCategory(id) {
    const res = await fetch(`${apiBase}/api/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    const data = await res.json()
    if (data.success) await fetchCategories()
    return { success: data.success, message: data.message }
  }

  return { categories, loading, error, fetchCategories, createCategory, updateCategory, deleteCategory }
}
