var options = [
    {first: "text1",second:"desc1"},
    {first: "dddddddddddddddddddddddd",second:"desc2"},
];


function createTable(tableData) {
    var table = document.createElement('table');
    var tableBody = document.createElement('tbody');
  
    tableData.forEach(function(rowData) {
      var row = document.createElement('tr');
  
      for (let [key, value] of Object.entries(rowData)) {
        var cell = document.createElement('td');
        cell.appendChild(document.createTextNode(value));
        row.appendChild(cell);
      }
  
      tableBody.appendChild(row);
    });
  
    table.appendChild(tableBody);
    return table;
  }

/*function makeUL(array) {
// Create the list element:
var list = document.createElement('ul');

for (var i = 0; i < array.length; i++) {
    // Create the list item:
    var item = document.createElement('li');

    // Set its contents:
    item.appendChild(document.createTextNode(array[i]));

    // Add it to the list:
    list.appendChild(item);
}

// Finally, return the constructed list:
return list;
}*/

// Add the contents of options[0] to #foo:
document.getElementById('docs-list').appendChild(createTable(options));