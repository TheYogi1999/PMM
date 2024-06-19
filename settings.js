// settings.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

// Function to get the configuration from the form
function getConfigFromForm() {
    return {
        apiKey: document.getElementById('apiKey').value,
        authDomain: document.getElementById('authDomain').value,
        databaseURL: document.getElementById('databaseURL').value,
        projectId: document.getElementById('projectId').value,
        storageBucket: document.getElementById('storageBucket').value,
        messagingSenderId: document.getElementById('messagingSenderId').value,
        appId: document.getElementById('appId').value,
    };
}

// Event listener for form submission to save settings
document.getElementById('settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const config = getConfigFromForm();
    localStorage.setItem('firebaseConfig', JSON.stringify(config));
    alert('Settings saved');
    window.location.href = 'index.html';
});

// Event listener for the test connection button
document.getElementById('testConnectionBtn').addEventListener('click', () => {
    const config = getConfigFromForm();
    const resultElement = document.getElementById('testResult');

    try {
        // Initialize Firebase app with the provided config
        const app = initializeApp(config);
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
