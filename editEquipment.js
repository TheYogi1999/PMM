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
    equipmentDiv.textContent = `Equipment No: ${equipment.equipmentNo}, Serial No: ${equipment.serialNo}`;
    selectedEquipmentDiv.appendChild(equipmentDiv);
});

// Save changes to Firebase
editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const updates = {};
    selectedEquipment.forEach(equipment => {
        const equipmentRef = ref(db, `equipment/${equipment.id}`);
        
        // Only include fields that have been changed
        const formData = new FormData(editForm);
        formData.forEach((value, key) => {
            if (value) {
                updates[key] = value;
            }
        });
        
        update(equipmentRef, updates);
    });
    
    alert('Changes saved successfully!');
});
s
