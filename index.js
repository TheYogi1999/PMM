// index.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

// Function to get the configuration from localStorage
function getFirebaseConfig() {
    const config = localStorage.getItem('firebaseConfig');
    if (config) {
        return JSON.parse(config);
    } else {
        throw new Error('Firebase config not found');
    }
}

// Initialize Firebase
const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const equipmentTableBody = document.getElementById('equipmentTableBody');
const searchField = document.getElementById('searchField');

// Define the order of the columns
const columnOrder = [
    'equipmentNo', 'serialNo', 'equipmentType', 'modelNo', 'manufacturer', 'sapNo', 'customsNo', 
    'origin', 'batteryType', 'weight', 'imageLink', 'calibratedOn', 'cycleDuration', 
    'calibrationDueOn', 'handoverDate', 'handoverTo', 'location', 'returnDate', 
    'warehouse', 'storageLocation', 'calibrationStatus', 'utilizationStatus', 'comment'
];

let selectedRows = [];

// Fetch data from Firebase and display in the table
export function fetchData() {
    const equipmentRef = ref(db, 'equipment/');
    onValue(equipmentRef, (snapshot) => {
        equipmentTableBody.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const row = document.createElement('tr');
            
            columnOrder.forEach((col) => {
                const cell = document.createElement('td');
                cell.textContent = data[col] || '';
                row.appendChild(cell);
            });
            
            // Add click event to the row
            row.addEventListener('click', () => {
                if (row.classList.contains('selected') || row.classList.contains('selected-first')) {
                    row.classList.remove('selected');
                    row.classList.remove('selected-first');
                    selectedRows = selectedRows.filter(selectedRow => selectedRow !== row);
                } else {
                    selectedRows.push(row);
                    updateRowClasses();
                }
            });

            equipmentTableBody.appendChild(row);
        });
    });
}

function updateRowClasses() {
    selectedRows.forEach((row, index) => {
        if (index === 0) {
            row.classList.add('selected-first');
            row.classList.remove('selected');
        } else {
            row.classList.add('selected');
            row.classList.remove('selected-first');
        }
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
