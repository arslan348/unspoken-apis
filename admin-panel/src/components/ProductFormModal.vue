<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useCategories } from '../composables/useCategories.js'
import { useProducts } from '../composables/useProducts.js'
import { apiBase } from '../utils/api.js'

const props = defineProps({
  show: Boolean,
  product: { type: Object, default: null },
})

const emit = defineEmits(['close', 'save'])

const { categories, fetchCategories } = useCategories()
const { products, fetchProducts } = useProducts()

// Group categories for <optgroup>
const categoryGroups = computed(() => {
  const parents = categories.value.filter((c) => !c.parent)
  return parents.map((p) => ({
    parent: p,
    children: categories.value.filter((c) => c.parent?._id === p._id || c.parent === p._id),
  }))
})

// Products available to link (exclude the product being edited)
const availableProducts = computed(() =>
  products.value.filter((p) => p._id !== props.product?._id)
)

const relatedSearch = ref('')
const filteredAvailable = computed(() => {
  const q = relatedSearch.value.toLowerCase()
  return q
    ? availableProducts.value.filter((p) => p.name.toLowerCase().includes(q))
    : availableProducts.value
})

const form = ref({
  name: '', description: '', price: 0, image: '', scent: '',
  category: '', stock: 0, relatedProducts: [],
})
const saving = ref(false)
const errorMsg = ref('')
const imageError = ref('')
const imageUploading = ref(false)
const imagePreview = ref('')

onMounted(() => {
  fetchCategories()
  fetchProducts()
})

watch(
  () => props.product,
  (p) => {
    if (p) {
      form.value = {
        name: p.name,
        description: p.description,
        price: p.price,
        image: p.image,
        scent: p.scent || '',
        category: p.category?._id || p.category,
        stock: p.stock,
        relatedProducts: (p.relatedProducts || []).map((r) => r._id || r),
      }
    } else {
      form.value = {
        name: '', description: '', price: 0, image: '', scent: '',
        category: '', stock: 0, relatedProducts: [],
      }
    }
    errorMsg.value = ''
    imageError.value = ''
    relatedSearch.value = ''
    imagePreview.value = p?.image || ''
  },
  { immediate: true }
)

function toggleRelated(id) {
  const idx = form.value.relatedProducts.indexOf(id)
  if (idx === -1) {
    form.value.relatedProducts.push(id)
  } else {
    form.value.relatedProducts.splice(idx, 1)
  }
}

function isRelated(id) {
  return form.value.relatedProducts.includes(id)
}

function removeRelated(id) {
  form.value.relatedProducts = form.value.relatedProducts.filter((r) => r !== id)
}

function getProductName(id) {
  return availableProducts.value.find((p) => p._id === id)?.name || id
}

async function handleFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  imageError.value = ''

  const localUrl = URL.createObjectURL(file)
  imageUploading.value = true
  imagePreview.value = localUrl

  try {
    const token = localStorage.getItem('token')
    const fd = new FormData()
    fd.append('image', file)
    const res = await fetch(`${apiBase}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
    const data = await res.json()
    if (data.success) {
      form.value.image = data.url
    } else {
      imageError.value = data.message || 'Upload failed.'
      imagePreview.value = ''
    }
  } catch {
    imageError.value = 'Upload failed. Check your connection.'
    imagePreview.value = ''
  } finally {
    imageUploading.value = false
  }
}

async function submit() {
  errorMsg.value = ''
  imageError.value = ''
  if (!form.value.name || !form.value.description || !form.value.category) {
    errorMsg.value = 'Name, description and category are required.'
    return
  }
  if (imageUploading.value) {
    errorMsg.value = 'Please wait for the image to finish uploading.'
    return
  }
  saving.value = true
  emit('save', { ...form.value })
  saving.value = false
}
</script>

<template>
  <div v-if="show" class="overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ product ? 'Edit Product' : 'New Product' }}</h3>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>

      <form @submit.prevent="submit" class="modal-body">
        <!-- Name -->
        <div class="field">
          <label>Name</label>
          <input v-model="form.name" placeholder="Product name" required />
        </div>

        <!-- Description -->
        <div class="field">
          <label>Description</label>
          <textarea v-model="form.description" rows="3" placeholder="Product description" required></textarea>
        </div>

        <!-- Price + Stock -->
        <div class="row">
          <div class="field">
            <label>Price ($)</label>
            <input v-model.number="form.price" type="number" min="0" step="0.01" required />
          </div>
          <div class="field">
            <label>Stock</label>
            <input v-model.number="form.stock" type="number" min="0" required />
          </div>
        </div>

        <!-- Category -->
        <div class="field">
          <label>Category</label>
          <select v-model="form.category" required>
            <option value="" disabled>Select a category</option>
            <template v-for="group in categoryGroups" :key="group.parent._id">
              <optgroup v-if="group.children.length > 0" :label="group.parent.name">
                <option v-for="child in group.children" :key="child._id" :value="child._id">
                  {{ child.name }}
                </option>
              </optgroup>
              <option v-else :value="group.parent._id">{{ group.parent.name }}</option>
            </template>
          </select>
        </div>

        <!-- Scent -->
        <div class="field">
          <label>Scent <span class="optional">(optional)</span></label>
          <input v-model="form.scent" placeholder="e.g. Lavender, Vanilla" />
        </div>

        <!-- Image Upload -->
        <div class="field">
          <label>Product Image <span class="optional">(JPEG, PNG, WebP)</span></label>

          <div class="upload-area" :class="{ 'has-image': imagePreview, 'has-error': imageError }">
            <img v-if="imagePreview" :src="imagePreview" class="upload-preview" alt="Preview" />
            <div v-if="!imagePreview" class="upload-placeholder">
              <span class="upload-icon">📁</span>
              <span>Click to choose image</span>
            </div>
            <div v-if="imageUploading" class="upload-overlay">
              <span class="upload-spinner"></span> Uploading...
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="upload-input"
              @change="handleFileChange"
            />
          </div>

          <span v-if="imageError" class="field-error">{{ imageError }}</span>
          <span v-else-if="form.image && !imageUploading" class="field-hint">✓ Image uploaded successfully.</span>
          <span v-else-if="imageUploading" class="field-hint">Uploading...</span>

          <!-- Allow clearing -->
          <button
            v-if="form.image && !imageUploading"
            type="button"
            class="btn-clear-img"
            @click="form.image = ''; imagePreview = ''"
          >
            Remove image
          </button>
        </div>

        <!-- Related Products -->
        <div class="field">
          <label>Related Products <span class="optional">(optional)</span></label>

          <!-- Selected tags -->
          <div v-if="form.relatedProducts.length > 0" class="tags">
            <span v-for="id in form.relatedProducts" :key="id" class="tag">
              {{ getProductName(id) }}
              <button type="button" class="tag-remove" @click="removeRelated(id)">✕</button>
            </span>
          </div>

          <!-- Search + list -->
          <div class="related-picker">
            <input
              v-model="relatedSearch"
              placeholder="Search products..."
              class="related-search"
            />
            <div class="related-list">
              <div v-if="filteredAvailable.length === 0" class="related-empty">
                No products found.
              </div>
              <label
                v-for="p in filteredAvailable"
                :key="p._id"
                class="related-item"
                :class="{ selected: isRelated(p._id) }"
              >
                <input
                  type="checkbox"
                  :checked="isRelated(p._id)"
                  @change="toggleRelated(p._id)"
                />
                <img v-if="p.image" :src="p.image" :alt="p.name" class="related-thumb" />
                <div v-else class="related-no-img"></div>
                <div class="related-info">
                  <span class="related-name">{{ p.name }}</span>
                  <span class="related-price">${{ p.price?.toFixed(2) }}</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

        <div class="actions">
          <button type="button" class="btn-secondary" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'Saving...' : product ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #fff;
  border-radius: 10px;
  width: 540px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.05rem;
  color: #1a1a1a;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: #888;
  padding: 0.25rem;
  line-height: 1;
}
.close-btn:hover { color: #333; }

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
}

.field label {
  font-size: 0.83rem;
  font-weight: 500;
  color: #374151;
}

.field select,
.field input,
.field textarea {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
  font-family: inherit;
}

.field select:focus,
.field input:focus,
.field textarea:focus {
  border-color: #4f46e5;
}

.row {
  display: flex;
  gap: 1rem;
}

.optional {
  font-weight: 400;
  color: #9ca3af;
}

.error {
  color: #dc2626;
  font-size: 0.85rem;
  margin: 0;
}

.field-error {
  font-size: 0.78rem;
  color: #dc2626;
}

.field-hint {
  font-size: 0.78rem;
  color: #9ca3af;
}

.input-error {
  border-color: #dc2626 !important;
}

/* Upload */
.upload-area {
  position: relative;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s;
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area:hover { border-color: #4f46e5; }
.upload-area.has-image { border-style: solid; border-color: #e5e7eb; }
.upload-area.has-error { border-color: #dc2626; }

.upload-preview {
  width: 100%;
  max-height: 220px;
  object-fit: contain;
  display: block;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #9ca3af;
  font-size: 0.875rem;
  padding: 2rem;
}

.upload-icon { font-size: 2rem; }

.upload-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #4f46e5;
  font-weight: 500;
}

.upload-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #c4b5fd;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.upload-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}

.btn-clear-img {
  align-self: flex-start;
  background: none;
  border: none;
  color: #dc2626;
  font-size: 0.78rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}
.btn-clear-img:hover { color: #b91c1c; }

/* Tags */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  background: #ede9fe;
  color: #5b21b6;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 500;
}

.tag-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: #7c3aed;
  font-size: 0.7rem;
  padding: 0;
  line-height: 1;
  display: flex;
  align-items: center;
}
.tag-remove:hover { color: #4c1d95; }

/* Related picker */
.related-picker {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  overflow: hidden;
}

.related-search {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.88rem;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
}

.related-list {
  max-height: 200px;
  overflow-y: auto;
}

.related-empty {
  padding: 1rem;
  text-align: center;
  font-size: 0.85rem;
  color: #9ca3af;
}

.related-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.75rem;
  cursor: pointer;
  transition: background 0.1s;
  border-bottom: 1px solid #f9fafb;
}

.related-item:last-child { border-bottom: none; }
.related-item:hover { background: #f9fafb; }
.related-item.selected { background: #f5f3ff; }

.related-item input[type='checkbox'] {
  width: 15px;
  height: 15px;
  accent-color: #4f46e5;
  flex-shrink: 0;
  padding: 0;
  border: none;
}

.related-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 5px;
  border: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.related-no-img {
  width: 36px;
  height: 36px;
  background: #f3f4f6;
  border-radius: 5px;
  flex-shrink: 0;
}

.related-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.related-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.related-price {
  font-size: 0.75rem;
  color: #6b7280;
}

/* Actions */
.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.btn-primary {
  padding: 0.5rem 1.25rem;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-primary:hover:not(:disabled) { background: #4338ca; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-secondary {
  padding: 0.5rem 1.25rem;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-secondary:hover { background: #e5e7eb; }
</style>
