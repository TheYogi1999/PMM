// settings.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

// Load the configuration from localStorage when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const config = localStorage.getItem('firebaseConfig');
    if (config) {
        document.getElementById('firebaseConfig').value = config;
    }
});

// Event listener for form submission to save settings
document.getElementById('settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const config = document.getElementById('firebaseConfig').value;
    try {
        JSON.parse(config); // Validate JSON
        localStorage.setItem('firebaseConfig', config);
        alert('Settings saved');
        window.location.href = 'index.html';
    } catch (error) {
        alert('Invalid JSON format. Please correct the configuration.');
    }
});

// Event listener for the test connection button
document.getElementById('testConnectionBtn').addEventListener('click', () => {
    const config = document.getElementById('firebaseConfig').value;
    const resultElement = document.getElementById('testResult');

    try {
        const parsedConfig = JSON.parse(config); // Parse JSON
        // Initialize Firebase app with the provided config
        const app = initializeApp(parsedConfig);
        const db = getDatabase(app);

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
