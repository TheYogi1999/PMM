// addEquipment.js

import { db } from './firebase-config.js';
import { ref, push, set } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

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
