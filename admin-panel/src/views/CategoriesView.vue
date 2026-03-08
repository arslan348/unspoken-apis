<script setup>
import { onMounted, ref, computed } from 'vue'
import { useCategories } from '../composables/useCategories.js'
import CategoryFormModal from '../components/CategoryFormModal.vue'

const { categories, loading, error, fetchCategories, createCategory, updateCategory, deleteCategory } = useCategories()

const showModal = ref(false)
const editingCategory = ref(null)
const toast = ref('')

onMounted(fetchCategories)

// Build tree: top-level categories each with their children
const tree = computed(() => {
  const parents = categories.value.filter((c) => !c.parent)
  return parents.map((parent) => ({
    ...parent,
    children: categories.value.filter((c) => c.parent?._id === parent._id || c.parent === parent._id),
  }))
})

function openCreate(parentId = null) {
  editingCategory.value = parentId ? { _isPresetParent: true, parent: { _id: parentId } } : null
  showModal.value = true
}

function openEdit(category) {
  editingCategory.value = category
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingCategory.value = null
}

async function handleSave(payload) {
  const isEdit = editingCategory.value && !editingCategory.value._isPresetParent
  let result
  if (isEdit) {
    result = await updateCategory(editingCategory.value._id, payload)
  } else {
    // If opened from a parent row, preset the parent
    if (editingCategory.value?._isPresetParent) {
      payload.parent = editingCategory.value.parent._id
    }
    result = await createCategory(payload)
  }
  if (result.success) {
    showToast(isEdit ? 'Category updated.' : 'Category created.')
    closeModal()
  } else {
    showToast(result.message || 'Something went wrong.', true)
  }
}

async function handleDelete(category) {
  if (!confirm(`Delete "${category.name}"?`)) return
  const result = await deleteCategory(category._id)
  if (result.success) {
    showToast('Category deleted.')
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
  <div class="categories-page">
    <div class="page-header">
      <div>
        <h2>Categories</h2>
        <p class="subtitle">Organize products into categories and subcategories</p>
      </div>
      <button class="btn-primary" @click="openCreate()">+ Add Category</button>
    </div>

    <div v-if="loading" class="state-msg">Loading categories...</div>
    <div v-else-if="error" class="state-msg error">{{ error }}</div>

    <div v-else-if="tree.length === 0" class="empty">
      <p>No categories yet.</p>
      <button class="btn-primary" @click="openCreate()">Add your first category</button>
    </div>

    <div v-else class="tree">
      <div v-for="parent in tree" :key="parent._id" class="parent-block">
        <!-- Parent row -->
        <div class="cat-row parent-row">
          <div class="cat-info">
            <span class="cat-name">{{ parent.name }}</span>
            <code class="slug">{{ parent.slug }}</code>
            <span v-if="parent.description" class="cat-desc">{{ parent.description }}</span>
          </div>
          <div class="cat-meta">
            <span class="badge-count">{{ parent.children.length }} sub</span>
            <span class="date">{{ new Date(parent.createdAt).toLocaleDateString() }}</span>
          </div>
          <div class="cat-actions">
            <button class="btn-sub" @click="openCreate(parent._id)" title="Add subcategory">+ Sub</button>
            <button class="btn-edit" @click="openEdit(parent)">Edit</button>
            <button class="btn-delete" @click="handleDelete(parent)">Delete</button>
          </div>
        </div>

        <!-- Subcategory rows -->
        <div v-if="parent.children.length > 0" class="children">
          <div v-for="child in parent.children" :key="child._id" class="cat-row child-row">
            <div class="child-indent">
              <span class="tree-line">└</span>
            </div>
            <div class="cat-info">
              <span class="cat-name child-name">{{ child.name }}</span>
              <code class="slug">{{ child.slug }}</code>
              <span v-if="child.description" class="cat-desc">{{ child.description }}</span>
            </div>
            <div class="cat-meta">
              <span class="date">{{ new Date(child.createdAt).toLocaleDateString() }}</span>
            </div>
            <div class="cat-actions">
              <button class="btn-edit" @click="openEdit(child)">Edit</button>
              <button class="btn-delete" @click="handleDelete(child)">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CategoryFormModal
      :show="showModal"
      :category="editingCategory?._isPresetParent ? null : editingCategory"
      @close="closeModal"
      @save="handleSave"
    />

    <div v-if="toast" class="toast" :class="toast.startsWith('✗') ? 'toast-error' : 'toast-success'">
      {{ toast }}
    </div>
  </div>
</template>

<style scoped>
.categories-page {
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
.btn-primary:hover { background: #4338ca; }

.state-msg { padding: 2rem; text-align: center; color: #6b7280; }
.state-msg.error { color: #dc2626; }

.empty {
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

/* Tree */
.tree {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.parent-block {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
}

.cat-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
}

.parent-row {
  background: #f9fafb;
  border-bottom: 1px solid #f3f4f6;
}

.parent-row:last-child { border-bottom: none; }

.child-row {
  background: #fff;
  border-bottom: 1px solid #f9fafb;
}
.child-row:last-child { border-bottom: none; }
.child-row:hover { background: #fafafa; }

.child-indent {
  display: flex;
  align-items: center;
  padding-left: 0.5rem;
  color: #d1d5db;
  font-size: 1rem;
  flex-shrink: 0;
}

.tree-line {
  color: #9ca3af;
  font-size: 1.1rem;
}

.cat-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.cat-name {
  font-weight: 600;
  color: #1a1a1a;
  font-size: 0.92rem;
  white-space: nowrap;
}

.child-name {
  font-weight: 500;
  color: #374151;
}

.slug {
  font-size: 0.75rem;
  background: #ede9fe;
  color: #5b21b6;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  white-space: nowrap;
}

.cat-desc {
  font-size: 0.8rem;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.badge-count {
  font-size: 0.75rem;
  background: #dbeafe;
  color: #1d4ed8;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-weight: 500;
}

.date {
  font-size: 0.8rem;
  color: #9ca3af;
  white-space: nowrap;
}

.cat-actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

.btn-sub {
  padding: 0.3rem 0.65rem;
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
  border-radius: 5px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.btn-sub:hover { background: #dcfce7; }

.btn-edit {
  padding: 0.3rem 0.65rem;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-edit:hover { background: #e5e7eb; }

.btn-delete {
  padding: 0.3rem 0.65rem;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 5px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-delete:hover { background: #fee2e2; }

/* Children section */
.children { border-top: 1px solid #f3f4f6; }

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
.toast-success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
.toast-error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

@keyframes slidein {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
