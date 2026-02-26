import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { usePageStylesheets } from '../hooks/usePageStylesheets'
import { api } from '../services/api'

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack']
const APPLE_REMINDERS_SHORTCUT_NAME = 'Tasty Trove Grocery to Reminders'
const MEAL_CATEGORY_OPTIONS = [
  '',
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'appetizer',
  'side',
  'dessert',
  'drink',
  'soup',
  'salad',
  'sauce',
  'other',
]
const CUISINE_OPTIONS = [
  '',
  'american',
  'mexican',
  'italian',
  'chinese',
  'japanese',
  'indian',
  'thai',
  'french',
  'greek',
  'mediterranean',
  'korean',
  'vietnamese',
  'middle eastern',
  'spanish',
  'other',
]

function getGroceryItemKey(aisle, item) {
  return [
    String(aisle),
    String(item?.name || ''),
    String(item?.quantityText || ''),
    String(item?.sample || ''),
  ].join('::')
}

function toDateKey(date) {
  return new Date(date).toISOString().slice(0, 10)
}

function getWeekStart(dateInput = new Date()) {
  const date = new Date(dateInput)
  const day = date.getUTCDay()
  const offset = (day + 6) % 7
  date.setUTCDate(date.getUTCDate() - offset)
  return toDateKey(date)
}

function makeReadableDate(dateKey) {
  const parsedDate = new Date(`${dateKey}T00:00:00Z`)
  return parsedDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function titleize(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function PlannerPage({ user, sessionLoading }) {
  usePageStylesheets(['/stylesheets/planner.css'])

  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [mealPlan, setMealPlan] = useState({ entries: [] })
  const [weekDateKeys, setWeekDateKeys] = useState([])
  const [availableRecipes, setAvailableRecipes] = useState([])
  const [groceryItems, setGroceryItems] = useState([])
  const [groceryByAisle, setGroceryByAisle] = useState({})
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [loadingGrocery, setLoadingGrocery] = useState(false)
  const [plannerError, setPlannerError] = useState('')
  const [plannerMessage, setPlannerMessage] = useState('')
  const [exportMessage, setExportMessage] = useState('')
  const [exportError, setExportError] = useState('')
  const [removedGroceryItemKeys, setRemovedGroceryItemKeys] = useState([])
  const [groceryPreferences, setGroceryPreferences] = useState({
    weightUnit: 'lb',
    volumeUnit: 'cup',
  })
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [autofillBusy, setAutofillBusy] = useState(false)
  const [autofillForm, setAutofillForm] = useState({
    mealCategory: '',
    cuisineType: '',
    maxTotalTime: '',
    favoritesOnly: false,
    prioritizeFavorites: true,
    overwriteExisting: false,
    slots: [...MEAL_SLOTS],
  })

  useEffect(() => {
    if (!user) {
      return
    }

    let cancelled = false

    async function loadPageData() {
      setLoadingPlan(true)
      setPlannerError('')
      setPlannerMessage('')

      try {
        const [planData, recipeData, preferencesData] = await Promise.all([
          api.getMealPlan(weekStart),
          api.listRecipes(),
          api.getPlannerPreferences(),
        ])

        if (!cancelled) {
          setMealPlan(planData.mealPlan || { entries: [] })
          setWeekDateKeys(planData.weekDateKeys || [])
          setAvailableRecipes(recipeData.recipes || [])
          setGroceryPreferences({
            weightUnit: preferencesData?.groceryPreferences?.weightUnit || 'lb',
            volumeUnit: preferencesData?.groceryPreferences?.volumeUnit || 'cup',
          })
        }
      } catch (err) {
        console.log(err)
        if (!cancelled) {
          setPlannerError(err.message || 'Unable to load planner')
        }
      } finally {
        if (!cancelled) {
          setLoadingPlan(false)
        }
      }
    }

    loadPageData()

    return () => {
      cancelled = true
    }
  }, [weekStart, user?._id])

  const entriesMap = useMemo(() => {
    const map = new Map()
    ;(mealPlan.entries || []).forEach((entry) => {
      map.set(`${entry.dateKey}:${entry.slot}`, entry)
    })
    return map
  }, [mealPlan.entries])

  const removedGroceryItemSet = useMemo(
    () => new Set(removedGroceryItemKeys),
    [removedGroceryItemKeys]
  )

  const filteredGroceryByAisle = useMemo(() => {
    const filtered = {}

    Object.entries(groceryByAisle).forEach(([aisle, items]) => {
      const nextItems = (items || []).filter(
        (item) => !removedGroceryItemSet.has(getGroceryItemKey(aisle, item))
      )

      if (nextItems.length) {
        filtered[aisle] = nextItems
      }
    })

    return filtered
  }, [groceryByAisle, removedGroceryItemSet])

  const filteredGroceryItems = useMemo(
    () => Object.values(filteredGroceryByAisle).flat(),
    [filteredGroceryByAisle]
  )

  const removedCount = Math.max(groceryItems.length - filteredGroceryItems.length, 0)

  const appleRemindersPayload = useMemo(() => {
    const lines = []
    Object.entries(filteredGroceryByAisle).forEach(([aisle, items]) => {
      items.forEach((item) => {
        const quantitySuffix = item.quantityText ? ` (${item.quantityText})` : ''
        const countSuffix =
          !item.quantityText && item.count > 1 ? ` (x${item.count})` : ''
        lines.push(`[${aisle}] ${item.name}${quantitySuffix}${countSuffix}`)
      })
    })
    return lines.join('\n')
  }, [filteredGroceryByAisle])

  if (sessionLoading && !user) {
    return (
      <main className="planner-page">
        <h1>Loading planner...</h1>
      </main>
    )
  }

  if (!sessionLoading && !user) {
    return <Navigate to="/" replace />
  }

  async function assignRecipe(dateKey, slot, recipeId) {
    if (!recipeId) {
      await removeRecipe(dateKey, slot)
      return
    }

    try {
      setPlannerMessage('')
      const data = await api.upsertMealPlanEntry({
        weekStart,
        dateKey,
        slot,
        recipeId,
      })
      setMealPlan(data.mealPlan || { entries: [] })
    } catch (err) {
      console.log(err)
      setPlannerError(err.message || 'Unable to assign recipe')
    }
  }

  async function removeRecipe(dateKey, slot) {
    try {
      setPlannerMessage('')
      const data = await api.removeMealPlanEntry({
        weekStart,
        dateKey,
        slot,
      })
      setMealPlan(data?.mealPlan || { entries: [] })
    } catch (err) {
      console.log(err)
      setPlannerError(err.message || 'Unable to remove recipe')
    }
  }

  async function generateGroceryList() {
    setLoadingGrocery(true)
    setPlannerError('')
    setPlannerMessage('')
    setExportError('')
    setExportMessage('')
    setRemovedGroceryItemKeys([])

    try {
      const data = await api.getPlannerGrocery(weekStart)
      setGroceryItems(data.items || [])
      setGroceryByAisle(data.groupedItems || {})
      if (data.preferences) {
        setGroceryPreferences({
          weightUnit: data.preferences.weightUnit || 'lb',
          volumeUnit: data.preferences.volumeUnit || 'cup',
        })
      }
    } catch (err) {
      console.log(err)
      setPlannerError(err.message || 'Unable to generate grocery list')
    } finally {
      setLoadingGrocery(false)
    }
  }

  function handleRecipeDragStart(event, recipeId) {
    event.dataTransfer.setData('text/plain', recipeId)
  }

  async function handleSlotDrop(event, dateKey, slot) {
    event.preventDefault()
    const recipeId = event.dataTransfer.getData('text/plain')
    if (!recipeId) {
      return
    }

    await assignRecipe(dateKey, slot, recipeId)
  }

  function goToPrevWeek() {
    const current = new Date(`${weekStart}T00:00:00Z`)
    current.setUTCDate(current.getUTCDate() - 7)
    setWeekStart(toDateKey(current))
  }

  function goToNextWeek() {
    const current = new Date(`${weekStart}T00:00:00Z`)
    current.setUTCDate(current.getUTCDate() + 7)
    setWeekStart(toDateKey(current))
  }

  function handlePreferenceChange(field, value) {
    setGroceryPreferences((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSavePreferences() {
    setSavingPreferences(true)
    setPlannerError('')
    setPlannerMessage('')
    try {
      const data = await api.updatePlannerPreferences(groceryPreferences)
      const nextPreferences = data?.groceryPreferences || groceryPreferences
      setGroceryPreferences({
        weightUnit: nextPreferences.weightUnit || 'lb',
        volumeUnit: nextPreferences.volumeUnit || 'cup',
      })
      setPlannerMessage('Saved grocery unit preferences.')

      if (groceryItems.length) {
        const groceryData = await api.getPlannerGrocery(weekStart)
        setGroceryItems(groceryData.items || [])
        setGroceryByAisle(groceryData.groupedItems || {})
      }
    } catch (err) {
      console.log(err)
      setPlannerError(err.message || 'Unable to save grocery preferences')
    } finally {
      setSavingPreferences(false)
    }
  }

  function handleAutofillField(field, value) {
    setAutofillForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleToggleAutofillSlot(slot) {
    setAutofillForm((current) => {
      const hasSlot = current.slots.includes(slot)
      return {
        ...current,
        slots: hasSlot
          ? current.slots.filter((entry) => entry !== slot)
          : [...current.slots, slot],
      }
    })
  }

  async function handleAutofillWeek() {
    setAutofillBusy(true)
    setPlannerError('')
    setPlannerMessage('')
    try {
      const payload = {
        weekStart,
        goals: {
          mealCategory: autofillForm.mealCategory,
          cuisineType: autofillForm.cuisineType,
          maxTotalTime: Number(autofillForm.maxTotalTime) || 0,
          favoritesOnly: autofillForm.favoritesOnly,
          prioritizeFavorites: autofillForm.prioritizeFavorites,
          overwriteExisting: autofillForm.overwriteExisting,
          slots: autofillForm.slots,
        },
      }

      const data = await api.autofillMealPlan(payload)
      setMealPlan(data.mealPlan || { entries: [] })
      setWeekDateKeys(data.weekDateKeys || [])
      setPlannerMessage(`Autofilled ${Number(data.filledCount || 0)} slot(s).`)
    } catch (err) {
      console.log(err)
      setPlannerError(err.message || 'Unable to autofill this week')
    } finally {
      setAutofillBusy(false)
    }
  }

  async function handleCopyApplePayload() {
    setExportMessage('')
    setExportError('')

    if (!appleRemindersPayload.trim()) {
      setExportError('Generate a grocery list first.')
      return
    }

    if (!navigator?.clipboard?.writeText) {
      setExportError('Clipboard is not available in this browser.')
      return
    }

    try {
      await navigator.clipboard.writeText(appleRemindersPayload)
      setExportMessage('Copied grocery list text for Apple Reminders.')
    } catch (err) {
      console.log(err)
      setExportError('Unable to copy grocery list.')
    }
  }

  function copyTextSync(value) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false
    }

    try {
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.top = '-9999px'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      const copied = document.execCommand('copy')
      document.body.removeChild(textarea)
      return copied
    } catch (err) {
      console.log(err)
      return false
    }
  }

  function launchShortcutUrl(url) {
    if (typeof window === 'undefined') {
      return false
    }

    try {
      window.location.assign(url)
      return true
    } catch (err) {
      console.log(err)
    }

    try {
      const link = window.document.createElement('a')
      link.href = url
      link.rel = 'noreferrer'
      link.style.display = 'none'
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      return true
    } catch (err) {
      console.log(err)
    }

    return false
  }

  async function handleSendToAppleReminders() {
    setExportMessage('')
    setExportError('')

    if (!appleRemindersPayload.trim()) {
      setExportError('Generate a grocery list first.')
      return
    }

    if (typeof window === 'undefined') {
      setExportError('This action is only available in the browser.')
      return
    }

    let copied = copyTextSync(appleRemindersPayload)
    if (!copied && navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(appleRemindersPayload)
        copied = true
      } catch (err) {
        console.log(err)
      }
    }

    if (!copied) {
      setExportError(
        'Unable to copy grocery list for export. Use "Copy For Reminders" and run the shortcut manually.'
      )
      return
    }

    const shortcutUrl =
      `shortcuts://run-shortcut?name=` +
      `${encodeURIComponent(APPLE_REMINDERS_SHORTCUT_NAME)}`
    const launched = launchShortcutUrl(shortcutUrl)
    if (!launched) {
      setExportError(
        'Unable to open Apple Shortcuts from this browser. Use "Copy For Reminders" and run the shortcut manually.'
      )
      return
    }

    setExportMessage('Copied grocery list and opening Apple Shortcuts...')
  }

  function handleRemoveGroceryItem(aisle, item) {
    const key = getGroceryItemKey(aisle, item)
    setRemovedGroceryItemKeys((current) =>
      current.includes(key) ? current : [...current, key]
    )
    setExportError('')
    setExportMessage('')
  }

  function handleResetRemovedItems() {
    setRemovedGroceryItemKeys([])
    setExportError('')
    setExportMessage('')
  }

  return (
    <main className="planner-page">
      <section className="planner-shell">
        <h1>Meal Planner</h1>
        <p>
          Plan meals by dragging recipes into each slot, then auto-generate your
          grocery list.
        </p>
        <div className="planner-controls">
          <button type="button" onClick={goToPrevWeek}>
            Previous Week
          </button>
          <label htmlFor="week-start-input">Week Start</label>
          <input
            id="week-start-input"
            type="date"
            value={weekStart}
            onChange={(event) => setWeekStart(event.target.value)}
          />
          <button type="button" onClick={goToNextWeek}>
            Next Week
          </button>
        </div>
        <div className="planner-pref-grid">
          <div className="planner-pref-card">
            <h3>Grocery Unit Preferences</h3>
            <p>Set your default units for consolidated grocery totals.</p>
            <div className="planner-pref-row">
              <label htmlFor="weight-unit-select">Weight</label>
              <select
                id="weight-unit-select"
                value={groceryPreferences.weightUnit}
                onChange={(event) =>
                  handlePreferenceChange('weightUnit', event.target.value)
                }
              >
                <option value="lb">lb</option>
                <option value="kg">kg</option>
              </select>
            </div>
            <div className="planner-pref-row">
              <label htmlFor="volume-unit-select">Volume</label>
              <select
                id="volume-unit-select"
                value={groceryPreferences.volumeUnit}
                onChange={(event) =>
                  handlePreferenceChange('volumeUnit', event.target.value)
                }
              >
                <option value="cup">cups / tbsp / tsp</option>
                <option value="ml">ml / l</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={savingPreferences}
            >
              {savingPreferences ? 'Saving...' : 'Save Unit Preferences'}
            </button>
          </div>
          <div className="planner-pref-card">
            <h3>Autofill Week</h3>
            <p>Fill empty slots using category, cuisine, time, and favorites.</p>
            <div className="planner-pref-row">
              <label htmlFor="autofill-meal-category">Meal Category</label>
              <select
                id="autofill-meal-category"
                value={autofillForm.mealCategory}
                onChange={(event) =>
                  handleAutofillField('mealCategory', event.target.value)
                }
              >
                {MEAL_CATEGORY_OPTIONS.map((option) => (
                  <option key={option || 'any'} value={option}>
                    {option ? titleize(option) : 'Any'}
                  </option>
                ))}
              </select>
            </div>
            <div className="planner-pref-row">
              <label htmlFor="autofill-cuisine">Cuisine</label>
              <select
                id="autofill-cuisine"
                value={autofillForm.cuisineType}
                onChange={(event) =>
                  handleAutofillField('cuisineType', event.target.value)
                }
              >
                {CUISINE_OPTIONS.map((option) => (
                  <option key={option || 'any-cuisine'} value={option}>
                    {option ? titleize(option) : 'Any'}
                  </option>
                ))}
              </select>
            </div>
            <div className="planner-pref-row">
              <label htmlFor="autofill-max-time">Max Time (min)</label>
              <input
                id="autofill-max-time"
                type="number"
                min="0"
                value={autofillForm.maxTotalTime}
                onChange={(event) =>
                  handleAutofillField('maxTotalTime', event.target.value)
                }
              />
            </div>
            <div className="planner-slot-toggle-row">
              {MEAL_SLOTS.map((slot) => (
                <label key={slot} className="planner-slot-toggle">
                  <input
                    type="checkbox"
                    checked={autofillForm.slots.includes(slot)}
                    onChange={() => handleToggleAutofillSlot(slot)}
                  />
                  <span>{titleize(slot)}</span>
                </label>
              ))}
            </div>
            <label className="planner-check-row">
              <input
                type="checkbox"
                checked={autofillForm.prioritizeFavorites}
                onChange={(event) =>
                  handleAutofillField('prioritizeFavorites', event.target.checked)
                }
              />
              <span>Prioritize favorites</span>
            </label>
            <label className="planner-check-row">
              <input
                type="checkbox"
                checked={autofillForm.favoritesOnly}
                onChange={(event) =>
                  handleAutofillField('favoritesOnly', event.target.checked)
                }
              />
              <span>Favorites only</span>
            </label>
            <label className="planner-check-row">
              <input
                type="checkbox"
                checked={autofillForm.overwriteExisting}
                onChange={(event) =>
                  handleAutofillField('overwriteExisting', event.target.checked)
                }
              />
              <span>Overwrite existing assignments</span>
            </label>
            <button
              type="button"
              onClick={handleAutofillWeek}
              disabled={autofillBusy || !autofillForm.slots.length}
            >
              {autofillBusy ? 'Autofilling...' : 'Autofill Week'}
            </button>
          </div>
        </div>
        {plannerError ? <p className="planner-error">{plannerError}</p> : null}
        {plannerMessage ? <p className="planner-success">{plannerMessage}</p> : null}
      </section>

      <section className="planner-shell">
        <h2>Recipe Bank</h2>
        <p>Drag any recipe onto a day/slot below.</p>
        <div className="recipe-bank">
          {availableRecipes.map((recipe) => (
            <article
              key={recipe._id}
              className="recipe-bank-item"
              draggable
              onDragStart={(event) => handleRecipeDragStart(event, recipe._id)}
            >
              <img
                src={recipe.imageUrl || '/assets/images/logo-images/logo.png'}
                alt={recipe.name}
              />
              <h3>{recipe.name}</h3>
              <p>
                {titleize(recipe.mealCategory || 'other')} |{' '}
                {titleize(recipe.cuisineType || 'other')}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="planner-shell">
        <h2>Weekly Calendar</h2>
        {loadingPlan ? <p>Loading plan...</p> : null}
        <div className="planner-grid">
          {weekDateKeys.map((dateKey) => (
            <article key={dateKey} className="planner-day-card">
              <h3>{makeReadableDate(dateKey)}</h3>
              {MEAL_SLOTS.map((slot) => {
                const mapKey = `${dateKey}:${slot}`
                const entry = entriesMap.get(mapKey)

                return (
                  <div
                    key={mapKey}
                    className="planner-slot"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleSlotDrop(event, dateKey, slot)}
                  >
                    <label>{titleize(slot)}</label>
                    <select
                      value={entry?.recipe?._id || ''}
                      onChange={(event) =>
                        assignRecipe(dateKey, slot, event.target.value)
                      }
                    >
                      <option value="">-- Unassigned --</option>
                      {availableRecipes.map((recipe) => (
                        <option key={recipe._id} value={recipe._id}>
                          {recipe.name}
                        </option>
                      ))}
                    </select>
                    {entry?.recipe ? (
                      <div className="slot-preview">
                        <span>{entry.recipe.name}</span>
                        <button
                          type="button"
                          onClick={() => removeRecipe(dateKey, slot)}
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <p className="drop-hint">Drop recipe here</p>
                    )}
                  </div>
                )
              })}
            </article>
          ))}
        </div>
      </section>

      <section className="planner-shell">
        <div className="grocery-header">
          <h2>Auto Grocery List</h2>
          <div className="grocery-header-actions">
            <button
              type="button"
              onClick={generateGroceryList}
              disabled={loadingGrocery}
            >
              {loadingGrocery ? 'Generating...' : 'Generate Grocery List'}
            </button>
            <button
              type="button"
              className="grocery-export-btn"
              onClick={handleSendToAppleReminders}
              disabled={!filteredGroceryItems.length}
            >
              Export To Apple Reminders
            </button>
            <button
              type="button"
              className="grocery-export-btn grocery-export-btn--secondary"
              onClick={handleCopyApplePayload}
              disabled={!filteredGroceryItems.length}
            >
              Copy For Reminders
            </button>
            {removedCount ? (
              <button
                type="button"
                className="grocery-export-btn grocery-export-btn--secondary"
                onClick={handleResetRemovedItems}
              >
                Restore Removed ({removedCount})
              </button>
            ) : null}
          </div>
        </div>
        <p className="grocery-export-hint">
          Use with an Apple Shortcut named "{APPLE_REMINDERS_SHORTCUT_NAME}" that
          reads clipboard text, splits by newline, and creates reminders in your
          Grocery list. The export button copies your grocery list first, then
          opens the shortcut. You can remove items below before exporting.
        </p>
        {exportError ? <p className="planner-error">{exportError}</p> : null}
        {exportMessage ? <p className="planner-success">{exportMessage}</p> : null}
        {filteredGroceryItems.length ? (
          <p className="grocery-summary">
            {filteredGroceryItems.length} item
            {filteredGroceryItems.length === 1 ? '' : 's'} across{' '}
            {Object.keys(filteredGroceryByAisle).length} aisle
            {Object.keys(filteredGroceryByAisle).length === 1 ? '' : 's'}
            {removedCount ? ` (${removedCount} removed)` : ''}
          </p>
        ) : null}
        {!filteredGroceryItems.length ? (
          <p className="grocery-empty">
            {groceryItems.length
              ? 'All current grocery items are removed. Restore removed items or generate again.'
              : 'No grocery items yet. Generate from your current week plan.'}
          </p>
        ) : null}
        <div className="grocery-aisles-grid">
          {Object.entries(filteredGroceryByAisle).map(([aisle, items]) => (
            <article key={aisle} className="grocery-aisle">
              <header className="grocery-aisle-header">
                <h3>{aisle}</h3>
                <span>
                  {items.length} item{items.length === 1 ? '' : 's'}
                </span>
              </header>
              <ul className="grocery-item-list">
                {items.map((item) => (
                  <li
                    key={`${aisle}-${item.name}-${item.quantityText || item.sample || ''}`}
                    className="grocery-item-row"
                  >
                    <div className="grocery-item-content">
                      <strong className="grocery-item-name">{item.name}</strong>
                      {item.quantityText ? (
                        <p className="grocery-item-quantity">Total: {item.quantityText}</p>
                      ) : null}
                      {item.sample ? (
                        <p className="grocery-item-sample">{item.sample}</p>
                      ) : null}
                      {item.recipes?.length ? (
                        <p className="grocery-item-meta">
                          Used in {item.recipes.length} recipe
                          {item.recipes.length === 1 ? '' : 's'}
                        </p>
                      ) : null}
                    </div>
                    <div className="grocery-item-actions">
                      {!item.quantityText && item.count > 1 ? (
                        <span className="grocery-item-count">x{item.count}</span>
                      ) : null}
                      <button
                        type="button"
                        className="grocery-item-remove"
                        onClick={() => handleRemoveGroceryItem(aisle, item)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export { PlannerPage }
