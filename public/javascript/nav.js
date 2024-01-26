const getElement = (selector) => document.querySelector(selector)

const links = getElement('.nav-links')
const navBtnDOM = getElement('.nav-btn')

navBtnDOM.addEventListener('click', () => {
  links?.classList.toggle('show-links')
})


