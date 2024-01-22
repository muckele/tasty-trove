document.getElementById('add-step-button').addEventListener('click', function() {
  console.log('Button clicked!');
  addNewListItem();
});

function addNewListItem() {
  let ol = document.getElementById('preparation-list');
  let newLi = document.createElement('li');
  newLi.innerHTML = '<input type="text" name="preparation[]' + (ol.childElementCount + 1) + '" placeholder="Step ' + (ol.childElementCount + 1) + '">';
  ol.appendChild(newLi);
}
