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
let app;
let db;

try {
    const firebaseConfig = getFirebaseConfig();
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
} catch (error) {
    console.error('Error initializing Firebase: ', error);
    document.getElementById('testResult').textContent = 'Error initializing Firebase: ' + error.message;
    document.getElementById('testResult').style.color = 'red';
}

document.getElementById('addEquipmentForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const equipmentData = {
        equipmentNo: document.getElementById('equipmentNo').value,
        serialNo: document.getElementById('serialNo').value,
        equipmentType: document.getElementById('equipmentType').value,
        modelNo: document.getElementById('modelNo').value,
        manufacturer: document.getElementById('manufacturer').value,
        sapNo: document.getElementById('sapNo').value,
        customsNo: document.getElementById('customsNo').value,
        origin: document.getElementById('origin').value,
        batteryType: document.getElementById('batteryType').value,
        weight: document.getElementById('weight').value,
        imageLink: document.getElementById('imageLink').value,
        calibratedOn: document.getElementById('calibratedOn').value,
        cycleDuration: document.getElementById('cycleDuration').value,
        calibrationDueOn: document.getElementById('calibrationDueOn').value,
        handoverDate: document.getElementById('handoverDate').value,
        handoverTo: document.getElementById('handoverTo').value,
        location: document.getElementById('location').value,
        returnDate: document.getElementById('returnDate').value,
        warehouse: document.getElementById('warehouse').value,
        storageLocation: document.getElementById('storageLocation').value,
        calibrationStatus: document.getElementById('calibrationStatus').value,
        utilizationStatus: document.getElementById('utilizationStatus').value,
        comment: document.getElementById('comment').value,
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

// Event listener for the test connection button
document.getElementById('testConnectionBtn').addEventListener('click', () => {
    const resultElement = document.getElementById('testResult');

    try {
        // Reference to a test location in the database
        const testRef = ref(db, 'testConnection');

        // Set a test value in the database
        set(testRef, { test: 'success' })
            .then(() => {
                resultElement.textContent = 'Connection successful!';
                resultElement.style.color = 'green';
            })
            .catch((error) => {
                resultElement.textContent = `Connection failed: ${error.message}`;
                resultElement.style.color = 'red';
            });
    } catch (error) {
        resultElement.textContent = `Invalid configuration: ${error.message}`;
        resultElement.style.color = 'red';
    }
});
