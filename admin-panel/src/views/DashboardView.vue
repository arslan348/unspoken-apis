<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const route = useRoute()
const { user, logout } = useAuth()

function handleLogout() {
  logout()
  router.push('/login')
}

const navItems = [
  { label: 'Categories', path: '/categories', icon: '🗂️' },
  { label: 'Products', path: '/products', icon: '📦' },
]
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-brand">Admin Panel</div>

      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: route.path === item.path }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="user-name">{{ user?.name }}</div>
        <div class="user-role">{{ user?.role }}</div>
        <button class="logout-btn" @click="handleLogout">Logout</button>
      </div>
    </aside>

    <div class="main-wrap">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background: #f5f5f5;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #1e1b4b;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.sidebar-brand {
  padding: 1.25rem 1.25rem 1rem;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  letter-spacing: 0.02em;
}

.sidebar-nav {
  flex: 1;
  padding: 0.75rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 0.85rem;
  border-radius: 7px;
  color: rgba(255,255,255,0.65);
  text-decoration: none;
  font-size: 0.9rem;
  transition: background 0.15s, color 0.15s;
}

.nav-item:hover {
  background: rgba(255,255,255,0.08);
  color: #fff;
}

.nav-item.active {
  background: #4f46e5;
  color: #fff;
}

.nav-icon {
  font-size: 1rem;
}

.sidebar-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid rgba(255,255,255,0.08);
}

.user-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
}

.user-role {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.5);
  margin-bottom: 0.75rem;
  text-transform: capitalize;
}

.logout-btn {
  width: 100%;
  padding: 0.45rem;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
}

.logout-btn:hover {
  background: rgba(255,255,255,0.15);
  color: #fff;
}

.main-wrap {
  flex: 1;
  overflow-y: auto;
}
</style>
