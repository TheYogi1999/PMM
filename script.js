// script.js

import { db } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

const equipmentTableBody = document.getElementById('equipmentTableBody');
const searchField = document.getElementById('searchField');

// Fetch data from Firebase and display in the table
function fetchData() {
    const equipmentRef = ref(db, 'equipment/');
    onValue(equipmentRef, (snapshot) => {
        equipmentTableBody.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const row = document.createElement('tr');
            
            for (const key in data) {
                const cell = document.createElement('td');
                cell.textContent = data[key];
                row.appendChild(cell);
            }
            
            equipmentTableBody.appendChild(row);
        });
    });
}

// Filter table based on search input
searchField.addEventListener('input', () => {
    const filter = searchField.value.toLowerCase();
    const rows = equipmentTableBody.getElementsByTagName('tr');
    
    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].getElementsByTagName('td');
        let match = false;
        
        for (let j = 0; j < cells.length; j++) {
            if (cells[j].textContent.toLowerCase().includes(filter)) {
                match = true;
                break;
            }
        }
        
        rows[i].style.display = match ? '' : 'none';
    }
});

// Initial data fetch
fetchData();
