<script setup>
import { onMounted, ref } from 'vue'
import { useProducts } from '../composables/useProducts.js'
import ProductFormModal from '../components/ProductFormModal.vue'

const { products, loading, error, fetchProducts, createProduct, updateProduct, deleteProduct } = useProducts()

const showModal = ref(false)
const editingProduct = ref(null)
const toast = ref('')

onMounted(fetchProducts)

function openCreate() {
  editingProduct.value = null
  showModal.value = true
}

function openEdit(product) {
  editingProduct.value = product
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingProduct.value = null
}

async function handleSave(payload) {
  let result
  if (editingProduct.value) {
    result = await updateProduct(editingProduct.value._id, payload)
  } else {
    result = await createProduct(payload)
  }
  if (result.success) {
    showToast(editingProduct.value ? 'Product updated.' : 'Product created.')
    closeModal()
  } else {
    showToast(result.message || 'Something went wrong.', true)
  }
}

async function handleDelete(product) {
  if (!confirm(`Delete "${product.name}"?`)) return
  const result = await deleteProduct(product._id)
  if (result.success) {
    showToast('Product deleted.')
  } else {
    showToast(result.message || 'Delete failed.', true)
  }
}

let toastTimer = null
function showToast(msg, isError = false) {
  toast.value = (isError ? '✗ ' : '✓ ') + msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 3000)
}
</script>

<template>
  <div class="products-page">
    <div class="page-header">
      <div>
        <h2>Products</h2>
        <p class="subtitle">Manage your product catalog</p>
      </div>
      <button class="btn-primary" @click="openCreate">+ Add Product</button>
    </div>

    <div v-if="loading" class="state-msg">Loading products...</div>
    <div v-else-if="error" class="state-msg error">{{ error }}</div>

    <div v-else-if="products.length === 0" class="empty">
      <p>No products yet.</p>
      <button class="btn-primary" @click="openCreate">Add your first product</button>
    </div>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Image</th>
            <th>Name</th>
            <th>Category</th>
            <th>Scent</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product._id">
            <td>
              <img v-if="product.image" :src="product.image" :alt="product.name" class="thumb" />
              <div v-else class="no-img">—</div>
            </td>
            <td>
              <div class="product-name">{{ product.name }}</div>
              <div class="product-desc">{{ product.description }}</div>
            </td>
            <td><span class="badge">{{ product.category?.name || product.category }}</span></td>
            <td class="scent-cell">{{ product.scent || '—' }}</td>
            <td class="price">${{ product.price.toFixed(2) }}</td>
            <td>
              <span :class="['stock', product.stock === 0 ? 'out' : product.stock < 10 ? 'low' : 'ok']">
                {{ product.stock }}
              </span>
            </td>
            <td class="actions-cell">
              <button class="btn-edit" @click="openEdit(product)">Edit</button>
              <button class="btn-delete" @click="handleDelete(product)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ProductFormModal
      :show="showModal"
      :product="editingProduct"
      @close="closeModal"
      @save="handleSave"
    />

    <div v-if="toast" class="toast" :class="toast.startsWith('✗') ? 'toast-error' : 'toast-success'">
      {{ toast }}
    </div>
  </div>
</template>

<style scoped>
.products-page {
  padding: 2rem;
  position: relative;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.page-header h2 {
  margin: 0 0 0.25rem;
  font-size: 1.4rem;
  color: #1a1a1a;
}

.subtitle {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.btn-primary {
  padding: 0.55rem 1.25rem;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #4338ca;
}

.state-msg {
  padding: 2rem;
  text-align: center;
  color: #6b7280;
}

.state-msg.error {
  color: #dc2626;
}

.empty {
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.table-wrap {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

thead {
  background: #f9fafb;
}

th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.78rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #e5e7eb;
}

td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
}

tr:last-child td {
  border-bottom: none;
}

tr:hover td {
  background: #fafafa;
}

.thumb {
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.no-img {
  width: 44px;
  height: 44px;
  background: #f3f4f6;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 0.75rem;
}

.product-name {
  font-weight: 500;
  color: #1a1a1a;
}

.product-desc {
  font-size: 0.78rem;
  color: #9ca3af;
  margin-top: 0.15rem;
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  background: #ede9fe;
  color: #5b21b6;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.scent-cell {
  color: #6b7280;
  font-size: 0.85rem;
}

.price {
  font-weight: 600;
  color: #1a1a1a;
}

.stock {
  font-weight: 600;
  font-size: 0.88rem;
}

.stock.ok { color: #16a34a; }
.stock.low { color: #d97706; }
.stock.out { color: #dc2626; }

.actions-cell {
  display: flex;
  gap: 0.5rem;
}

.btn-edit {
  padding: 0.35rem 0.75rem;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-edit:hover {
  background: #e5e7eb;
}

.btn-delete {
  padding: 0.35rem 0.75rem;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 5px;
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-delete:hover {
  background: #fee2e2;
}

.toast {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 200;
  animation: slidein 0.2s ease;
}

.toast-success {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.toast-error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

@keyframes slidein {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
