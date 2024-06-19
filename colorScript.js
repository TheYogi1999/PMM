// colorScript.js

import { fetchData } from './index.js';

function applyColors() {
    const rows = document.getElementById('equipmentTableBody').getElementsByTagName('tr');
    
    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].getElementsByTagName('td');
        const calibrationStatus = cells[20].textContent;
        const utilizationStatus = cells[21].textContent;
        const calibratedOn = new Date(cells[11].textContent);
        const returnDate = new Date(cells[17].textContent);
        const today = new Date();

        if (calibrationStatus.includes('Calibrated') && utilizationStatus.includes('In storage') && calibratedOn >= today) {
            rows[i].style.backgroundColor = 'green';
        } else if (calibrationStatus.includes('uncalibrated') || utilizationStatus.includes('Check out') || returnDate < today) {
            rows[i].style.backgroundColor = 'red';
        } else if (calibrationStatus.includes('Organ donor') || utilizationStatus.includes('Paused')) {
            rows[i].style.backgroundColor = 'blue';
        } else if (calibratedOn.getTime() + 2 * 7 * 24 * 60 * 60 * 1000 < today.getTime()) {
            rows[i].style.backgroundColor = 'orange';
        }
    }
}

// Call the applyColors function after data is fetched
fetchData();
applyColors();
