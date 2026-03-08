<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useCategories } from '../composables/useCategories.js'

const props = defineProps({
  show: Boolean,
  category: { type: Object, default: null },
})

const emit = defineEmits(['close', 'save'])

const { categories, fetchCategories } = useCategories()

// Only top-level categories can be parents (no nesting beyond 1 level)
const parentOptions = computed(() =>
  categories.value.filter((c) => !c.parent && c._id !== props.category?._id)
)

const form = ref({ name: '', description: '', parent: '' })
const saving = ref(false)
const errorMsg = ref('')

onMounted(fetchCategories)

watch(
  () => props.category,
  (c) => {
    form.value = c
      ? { name: c.name, description: c.description || '', parent: c.parent?._id || c.parent || '' }
      : { name: '', description: '', parent: '' }
    errorMsg.value = ''
  },
  { immediate: true }
)

async function submit() {
  errorMsg.value = ''
  if (!form.value.name.trim()) {
    errorMsg.value = 'Category name is required.'
    return
  }
  saving.value = true
  emit('save', { name: form.value.name, description: form.value.description, parent: form.value.parent || null })
  saving.value = false
}
</script>

<template>
  <div v-if="show" class="overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ category ? 'Edit Category' : 'New Category' }}</h3>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>

      <form @submit.prevent="submit" class="modal-body">
        <div class="field">
          <label>Name</label>
          <input v-model="form.name" placeholder="e.g. Electronics" required />
        </div>
        <div class="field">
          <label>Parent Category <span class="optional">(optional — leave empty for top-level)</span></label>
          <select v-model="form.parent">
            <option value="">None (top-level category)</option>
            <option v-for="cat in parentOptions" :key="cat._id" :value="cat._id">{{ cat.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>Description <span class="optional">(optional)</span></label>
          <textarea v-model="form.description" rows="3" placeholder="Describe this category..."></textarea>
        </div>

        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

        <div class="actions">
          <button type="button" class="btn-secondary" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'Saving...' : category ? 'Update' : 'Create' }}
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
  width: 460px;
  max-width: 95vw;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
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
}

.field label {
  font-size: 0.83rem;
  font-weight: 500;
  color: #374151;
}

.optional {
  font-weight: 400;
  color: #9ca3af;
}

.field select,
.field input,
.field textarea {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
}

.field select:focus,
.field input:focus,
.field textarea:focus {
  border-color: #4f46e5;
}

.error {
  color: #dc2626;
  font-size: 0.85rem;
  margin: 0;
}

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
