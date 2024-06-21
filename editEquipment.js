document.addEventListener('DOMContentLoaded', () => {
    const selectedEquipment = JSON.parse(localStorage.getItem('selectedEquipment'));
    const selectedEquipmentTableBody = document.getElementById('selectedEquipmentTableBody');

    selectedEquipment.forEach(equipment => {
        const row = document.createElement('tr');

        const attributes = [
            'equipmentNo', 'serialNo', 'equipmentType', 'modelNo', 'manufacturer', 
            'sapNo', 'customsNo', 'origin', 'batteryType', 'weight', 
            'imageLink', 'calibratedOn', 'cycleDuration', 'calibrationDueOn', 
            'handoverDate', 'handoverTo', 'location', 'returnDate', 'warehouse', 
            'storageLocation', 'calibrationStatus', 'utilizationStatus', 'comment'
        ];

        attributes.forEach(attr => {
            const cell = document.createElement('td');
            cell.textContent = equipment[attr] || '';
            row.appendChild(cell);
        });

        selectedEquipmentTableBody.appendChild(row);
    });
});
