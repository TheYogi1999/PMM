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

// Ensure the document is fully loaded before running the script
document.addEventListener('DOMContentLoaded', (event) => {
    // Get selected equipment from sessionStorage
    const selectedEquipment = JSON.parse(sessionStorage.getItem('selectedEquipment')) || [];

    // Display selected equipment
    const equipmentListDiv = document.getElementById('equipmentList');
    selectedEquipment.forEach(equipment => {
        const equipmentDiv = document.createElement('div');
        equipmentDiv.textContent = equipment.name; // assuming equipment has a name property
        equipmentListDiv.appendChild(equipmentDiv);
    });
});

// Initial data fetch
fetchData();
