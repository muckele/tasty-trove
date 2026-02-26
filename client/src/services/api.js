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
  listRecipes(query = '') {
    const params = new URLSearchParams()
    if (query.trim()) {
      params.set('query', query.trim())
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
