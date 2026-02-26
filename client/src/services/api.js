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
    throw new Error(data?.error || `Request failed with status ${response.status}`)
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

    const suffix = params.toString() ? `?${params.toString()}` : ''
    return request(`/api/recipes${suffix}`)
  },
  getRecipe(recipeId) {
    return request(`/api/recipes/${recipeId}`)
  },
  createRecipe(payload) {
    return request('/api/recipes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  importRecipe(url) {
    return request('/api/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url }),
    })
  },
  importRecipeFromText(text) {
    return request('/api/recipes/import-text', {
      method: 'POST',
      body: JSON.stringify({ text }),
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
  deleteRecipe(recipeId) {
    return request(`/api/recipes/${recipeId}`, {
      method: 'DELETE',
    })
  },
  createReview(recipeId, payload) {
    return request(`/api/recipes/${recipeId}/reviews`, {
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
}

export {
  api,
}
