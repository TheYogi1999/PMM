// addEquipment.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

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

document.getElementById('addEquipmentForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const equipmentData = {
        equipmentNo: document.getElementById('equipmentNo').value,
        serialNo: document.getElementById('serialNo').value,
        equipmentType: document.getElementById('equipmentType').value,
        modelNo: document.getElementById('modelNo').value,
        manufacturer: document.getElementById('manufacturer').value,
        sapNo: document.getElementById('sapNo').value,
        // Add additional form fields here
    };

    const newEquipmentRef = push(ref(db, 'equipment/'));
    set(newEquipmentRef, equipmentData)
        .then(() => {
            alert('Equipment added successfully');
            window.location.href = 'index.html'; // Redirect back to the main page after submission
        })
        .catch((error) => {
            console.error('Error adding equipment: ', error);
        });
});
