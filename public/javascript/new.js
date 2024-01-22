document.getElementById('preparation-list').addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    addNewListItem()
  }
})

function addNewListItem() {
  let ol = document.getElementById('preparation-list')
  let newLi = document.createElement('li')
  newLi.innerHTML = '<input type="text" name="preparation[]' + (ol.childElementCount + 1) + '" placeholder="Step ' + (ol.childElementCount + 1) + '">'
  ol.appendChild(newLi)
}