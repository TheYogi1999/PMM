// editEquipment.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, update } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

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

const selectedEquipmentDiv = document.getElementById('selectedEquipment');
const editForm = document.getElementById('editForm');

// Get selected equipment from sessionStorage
const selectedEquipment = JSON.parse(sessionStorage.getItem('selectedEquipment')) || [];

// Display selected equipment
selectedEquipment.forEach(equipment => {
    const equipmentDiv = document.createElement('div');
    equipmentDiv.textContent = equipment.name; // assuming equipment has a name property
    selectedEquipmentDiv.appendChild(equipmentDiv);
});

// Save selected equipment to sessionStorage when clicking 'Edit Equipment'
document.getElementById('editEquipmentButton').addEventListener('click', () => {
    const equipment = {
        // gather equipment data from the form
        name: document.getElementById('equipmentName').value
        // add other properties as needed
    };
    selectedEquipment.push(equipment);
    sessionStorage.setItem('selectedEquipment', JSON.stringify(selectedEquipment));
    // Redirect to main Equipment page
    window.location.href = 'equipment.html';
});
