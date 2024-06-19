// settings.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

document.getElementById('settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const config = {
        apiKey: document.getElementById('apiKey').value,
        authDomain: document.getElementById('authDomain').value,
        databaseURL: document.getElementById('databaseURL').value,
        projectId: document.getElementById('projectId').value,
        storageBucket: document.getElementById('storageBucket').value,
        messagingSenderId: document.getElementById('messagingSenderId').value,
        appId: document.getElementById('appId').value,
    };

    localStorage.setItem('firebaseConfig', JSON.stringify(config));
    alert('Settings saved');
    window.location.href = 'index.html';
});

document.getElementById('testConnectionBtn').addEventListener('click', () => {
    const config = {
        apiKey: document.getElementById('apiKey').value,
        authDomain: document.getElementById('authDomain').value,
        databaseURL: document.getElementById('databaseURL').value,
        projectId: document.getElementById('projectId').value,
        storageBucket: document.getElementById('storageBucket').value,
        messagingSenderId: document.getElementById('messagingSenderId').value,
        appId: document.getElementById('appId').value,
    };

    try {
        const app = initializeApp(config);
        const db = getDatabase(app);
        const testRef = ref(db, 'testConnection');
        set(testRef, { test: 'success' })
            .then(() => {
                document.getElementById('testResult').textContent = 'Connection successful!';
                document.getElementById('testResult').style.color = 'green';
            })
            .catch((error) => {
                document.getElementById('testResult').textContent = `Connection failed: ${error.message}`;
                document.getElementById('testResult').style.color = 'red';
            });
    } catch (error) {
        document.getElementById('testResult').textContent = `Invalid configuration: ${error.message}`;
        document.getElementById('testResult').style.color = 'red';
    }
});
