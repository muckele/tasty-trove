async function request(path, options = {}) {
  const config = {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  }

  const response = await fetch(path, config)
  if (response.status === 204) {
    return null
  }

  const isJson = response.headers
    .get('content-type')
    ?.includes('application/json')
  const data = isJson ? await response.json() : null

  if (!response.ok) {
    const error = new Error(
      data?.error || `Request failed with status ${response.status}`
    )
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

const api = {
  getSession() {
    return request('/auth/session')
  },
  logout() {
    return request('/auth/logout', { method: 'POST' })
  },
  getHome() {
    return request('/api/home')
  },
  listRecipes(filters = {}) {
    const normalizedFilters =
      typeof filters === 'string' ? { query: filters } : filters

    const query = String(normalizedFilters.query || '').trim()
    const mealCategory = String(normalizedFilters.mealCategory || '').trim()
    const cuisineType = String(normalizedFilters.cuisineType || '').trim()
    const dietaryTag = String(normalizedFilters.dietaryTag || '').trim()
    const allergenTag = String(normalizedFilters.allergenTag || '').trim()

    const params = new URLSearchParams()
    if (query) {
      params.set('query', query)
    }

    if (mealCategory) {
      params.set('mealCategory', mealCategory)
    }

    if (cuisineType) {
      params.set('cuisineType', cuisineType)
    }

    if (dietaryTag) {
      params.set('dietaryTag', dietaryTag)
    }

    if (allergenTag) {
      params.set('allergenTag', allergenTag)
    }

    const suffix = params.toString() ? `?${params.toString()}` : ''
    return request(`/api/recipes${suffix}`)
  },
  getRecipe(recipeId, shareToken = '') {
    const token = String(shareToken || '').trim()
    if (!token) {
      return request(`/api/recipes/${recipeId}`)
    }

    const params = new URLSearchParams({ shareToken: token })
    return request(`/api/recipes/${recipeId}?${params.toString()}`)
  },
  getSharedRecipe(shareToken) {
    return request(`/api/recipes/shared/${shareToken}`)
  },
  createRecipe(payload) {
    return request('/api/recipes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  importRecipe(url, options = {}) {
    return request('/api/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url, ...options }),
    })
  },
  importRecipeFromText(text, options = {}) {
    return request('/api/recipes/import-text', {
      method: 'POST',
      body: JSON.stringify({ text, ...options }),
    })
  },
  parseRecipeFromText(text) {
    return request('/api/recipes/parse-text', {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  },
  updateRecipe(recipeId, payload) {
    return request(`/api/recipes/${recipeId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  regenerateShareToken(recipeId) {
    return request(`/api/recipes/${recipeId}/share-token`, {
      method: 'POST',
    })
  },
  updateOwnerNote(recipeId, content) {
    return request(`/api/recipes/${recipeId}/owner-note`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    })
  },
  listRecipeVersions(recipeId) {
    return request(`/api/recipes/${recipeId}/versions`)
  },
  restoreRecipeVersion(recipeId, versionId) {
    return request(`/api/recipes/${recipeId}/versions/${versionId}/restore`, {
      method: 'POST',
    })
  },
  deleteRecipe(recipeId) {
    return request(`/api/recipes/${recipeId}`, {
      method: 'DELETE',
    })
  },
  createReview(recipeId, payload, shareToken = '') {
    const token = String(shareToken || '').trim()
    const suffix = token
      ? `?${new URLSearchParams({ shareToken: token }).toString()}`
      : ''

    return request(`/api/recipes/${recipeId}/reviews${suffix}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateReview(recipeId, reviewId, payload) {
    return request(`/api/recipes/${recipeId}/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  deleteReview(recipeId, reviewId) {
    return request(`/api/recipes/${recipeId}/reviews/${reviewId}`, {
      method: 'DELETE',
    })
  },
  getLibrary() {
    return request('/api/library')
  },
  addFavorite(recipeId) {
    return request(`/api/library/favorites/${recipeId}`, {
      method: 'POST',
    })
  },
  removeFavorite(recipeId) {
    return request(`/api/library/favorites/${recipeId}`, {
      method: 'DELETE',
    })
  },
  createCollection(name) {
    return request('/api/library/collections', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  },
  renameCollection(collectionId, name) {
    return request(`/api/library/collections/${collectionId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    })
  },
  deleteCollection(collectionId) {
    return request(`/api/library/collections/${collectionId}`, {
      method: 'DELETE',
    })
  },
  addRecipeToCollection(collectionId, recipeId) {
    return request(`/api/library/collections/${collectionId}/recipes/${recipeId}`, {
      method: 'POST',
    })
  },
  removeRecipeFromCollection(collectionId, recipeId) {
    return request(`/api/library/collections/${collectionId}/recipes/${recipeId}`, {
      method: 'DELETE',
    })
  },
  getMealPlan(weekStart) {
    const params = new URLSearchParams()
    if (String(weekStart || '').trim()) {
      params.set('weekStart', String(weekStart).trim())
    }

    const suffix = params.toString() ? `?${params.toString()}` : ''
    return request(`/api/planner${suffix}`)
  },
  upsertMealPlanEntry(payload) {
    return request('/api/planner/entry', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  removeMealPlanEntry(payload) {
    return request('/api/planner/entry', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    })
  },
  getPlannerGrocery(weekStart) {
    const params = new URLSearchParams()
    if (String(weekStart || '').trim()) {
      params.set('weekStart', String(weekStart).trim())
    }

    const suffix = params.toString() ? `?${params.toString()}` : ''
    return request(`/api/planner/grocery${suffix}`)
  },
}

export {
  api,
}
