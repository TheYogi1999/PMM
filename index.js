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
const editEquipmentBtn = document.getElementById('editEquipmentBtn');
const checkOutBtn = document.getElementById('checkOutBtn');
const calibrateBtn = document.getElementById('calibrateBtn');

let selectedRows = [];

// Function to fetch data from Firebase and display in the table
export function fetchData() {
    const equipmentRef = ref(db, 'equipment/');
    onValue(equipmentRef, (snapshot) => {
        equipmentTableBody.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const row = document.createElement('tr');
            
            // Including the ID in the data object
            data.id = childSnapshot.key;

            const attributes = [
                'equipmentNo', 'serialNo', 'equipmentType', 'modelNo', 'manufacturer', 
                'sapNo', 'customsNo', 'origin', 'batteryType', 'weight', 
                'imageLink', 'calibratedOn', 'cycleDuration', 'calibrationDueOn', 
                'handoverDate', 'handoverTo', 'location', 'returnDate', 'warehouse', 
                'storageLocation', 'calibrationStatus', 'utilizationStatus', 'comment'
            ];

            row.dataset.equipment = JSON.stringify(data);

            attributes.forEach(attr => {
                const cell = document.createElement('td');
                cell.textContent = data[attr] || ''; // Fallback to empty string if the attribute is missing
                row.appendChild(cell);
            });

            row.addEventListener('click', function() {
                if (selectedRows.includes(row)) {
                    row.classList.remove('selected');
                    selectedRows = selectedRows.filter(selectedRow => selectedRow !== row);
                } else {
                    row.classList.add('selected');
                    selectedRows.push(row);
                }
            });

            equipmentTableBody.appendChild(row);
        });
    });
}

editEquipmentBtn.addEventListener('click', () => {
    const selectedEquipment = selectedRows.map(row => JSON.parse(row.dataset.equipment));
    localStorage.setItem('selectedEquipment', JSON.stringify(selectedEquipment));
    window.location.href = 'editEquipment.html';
});

checkOutBtn.addEventListener('click', () => {
    const selectedEquipment = selectedRows.map(row => JSON.parse(row.dataset.equipment));
    localStorage.setItem('selectedEquipment', JSON.stringify(selectedEquipment));
    window.location.href = 'checkOut.html';
});

calibrateBtn.addEventListener('click', () => {
    const selectedEquipment = selectedRows.map(row => JSON.parse(row.dataset.equipment));
    localStorage.setItem('selectedEquipment', JSON.stringify(selectedEquipment));
    window.location.href = 'calibration.html';
});

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
