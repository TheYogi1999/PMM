// settings.js

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
