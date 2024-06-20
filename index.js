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

let selectedRows = [];

// Function to fetch data from Firebase and display in the table
export function fetchData() {
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
        addRowEventListeners();
    });
}

// Function to add event listeners to table rows for selection
function addRowEventListeners() {
    const rows = equipmentTableBody.getElementsByTagName('tr');
    
    for (const row of rows) {
        row.addEventListener('click', function() {
            if (selectedRows.includes(row)) {
                row.classList.remove('selected');
                selectedRows = selectedRows.filter(selectedRow => selectedRow !== row);
            } else {
                row.classList.add('selected');
                selectedRows.push(row);
            }
        });
    }
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
