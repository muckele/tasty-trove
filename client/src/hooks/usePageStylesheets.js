import { useEffect } from 'react'

const stylesheetRefs = new Map()

function ensureStylesheet(href) {
  const currentCount = stylesheetRefs.get(href) || 0
  stylesheetRefs.set(href, currentCount + 1)

  if (currentCount > 0) {
    return
  }

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.pageHref = href
  document.head.appendChild(link)
}

function releaseStylesheet(href) {
  const currentCount = stylesheetRefs.get(href)
  if (!currentCount) {
    return
  }

  if (currentCount > 1) {
    stylesheetRefs.set(href, currentCount - 1)
    return
  }

  stylesheetRefs.delete(href)
  const link = document.querySelector(`link[data-page-href="${href}"]`)
  if (link) {
    link.remove()
  }
}

function usePageStylesheets(hrefs) {
  const key = hrefs.join('|')

  useEffect(() => {
    hrefs.forEach(ensureStylesheet)

    return () => {
      hrefs.forEach(releaseStylesheet)
    }
  }, [key])
}

export {
  usePageStylesheets,
}
