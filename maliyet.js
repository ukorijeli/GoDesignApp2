// maliyet.js (Hem Düzenleme Hem de Yeni Kayıt Ekleme Özellikli Nihai Sürüm)

document.addEventListener('DOMContentLoaded', () => {
    // --- Genel Değişkenler ve Kullanıcı Bilgileri ---
    const loggedInUser = localStorage.getItem('loggedInUser');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const userProfileInitialDiv = document.getElementById('userProfileInitial');
    const logoutButton = document.getElementById('logoutButton');
    const exportButton = document.getElementById('exportExcelBtn');

    // --- YENİ EKLENEN FORM ELEMENTLERİ ---
    const addCostSection = document.getElementById('addCostSection');
    const newCostForm = document.getElementById('newCostForm');
    const addCostMessage = document.getElementById('addCostMessage');

    // --- Sayfa Yükleme Kontrolleri ---
    if (!loggedInUser) {
        window.location.href = 'login.html';
        return;
    }

    if (userProfileInitialDiv) userProfileInitialDiv.textContent = loggedInUser.charAt(0).toUpperCase();
    if (logoutButton) logoutButton.addEventListener('click', () => { localStorage.clear(); window.location.href = 'login.html'; });

    if (exportButton) {
        exportButton.addEventListener('click', () => {
            const selectedCustomer = localStorage.getItem('selectedCustomer');
            const userForFilename = isAdmin && selectedCustomer ? selectedCustomer : loggedInUser;
            window.location.href = `${BASE_URL}/api/costs/export?customer=${encodeURIComponent(userForFilename)}`;
        });
    }

    // --- YENİ: ADMİN'E ÖZEL FORM GÖSTERİMİ VE OLAYLARI ---
    if (isAdmin) {
        if (addCostSection) addCostSection.style.display = 'block';
        if (newCostForm) newCostForm.addEventListener('submit', handleAddNewCost);
    }
    
    // --- YARDIMCI FONKSİYONLAR ---
    function formatCurrency(number) {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(number || 0);
    }
    
    function parseCurrency(value) {
        if (value === null || value === undefined || value === '') return 0;
        let s = String(value).trim();
        const lastComma = s.lastIndexOf(',');
        const lastDot = s.lastIndexOf('.');
        if (lastComma < lastDot || (lastComma === -1 && lastDot !== -1) || (lastComma === -1 && lastDot === -1)) {
            s = s.replace(/,/g, '');
        } else {
            s = s.replace(/\./g, '').replace(',', '.');
        }
        const cleaned = s.replace(/[^0-9.]/g, '');
        const number = parseFloat(cleaned);
        return isNaN(number) ? 0 : number;
    }

    // --- ANA FONKSİYONLAR ---
    async function loadCostData() {
        const tableHead = document.getElementById('cost-table-head');
        const tableBody = document.getElementById('cost-table-body');
        const desiredHeaderOrder = ['İş Kalemi', 'Alt Kalem / Açıklama', 'İşin Bedeli', 'Yapılan Ödeme', 'Ödeme Şekli', 'Ödeme Tarihi', 'Kalan Bakiye'];
        if (isAdmin) desiredHeaderOrder.push('İşlemler');

        tableBody.innerHTML = `<tr><td colspan="${desiredHeaderOrder.length}">Veriler yükleniyor...</td></tr>`;

        try {
            const response = await fetch(`${BASE_URL}/api/costs`);
            const data = await response.json();
            if (!response.ok || data.error) throw new Error(data.error || 'Veri alınamadı.');

            tableHead.innerHTML = '';
            tableBody.innerHTML = '';

            if (data.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="${desiredHeaderOrder.length}">Gösterilecek veri bulunamadı.</td></tr>`;
                return;
            }

            const headerRow = document.createElement('tr');
            desiredHeaderOrder.forEach(h => headerRow.appendChild(Object.assign(document.createElement('th'), { textContent: h })));
            tableHead.appendChild(headerRow);

            data.forEach(rowData => {
                const row = document.createElement('tr');
                row.dataset.id = rowData.id;
                desiredHeaderOrder.forEach(header => {
                    const cell = document.createElement('td');
                    if (header === 'İşlemler') {
                        cell.innerHTML = `<button class="admin-button edit-btn">Düzenle</button><button class="admin-button delete-btn" style="background-color: #e74c3c;">Sil</button><button class="admin-button save-btn" style="display:none; background-color: #28a745;">Kaydet</button><button class="admin-button cancel-btn" style="display:none; background-color: #7f8c8d;">İptal</button>`;
                    } else {
                        cell.textContent = rowData[header] !== undefined ? rowData[header] : '';
                        cell.dataset.column = header;
                    }
                    row.appendChild(cell);
                });
                tableBody.appendChild(row);
            });
            if (isAdmin) addEventListenersToAdminButtons();
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="${desiredHeaderOrder.length}" style="color:red;">Hata: ${error.message}</td></tr>`;
        }
    }
    
    function addEventListenersToAdminButtons() {
        document.querySelectorAll('.edit-btn').forEach(b => b.onclick = (e) => toggleEditMode(e.target.closest('tr'), true));
        document.querySelectorAll('.delete-btn').forEach(b => b.onclick = (e) => deleteRow(e.target.closest('tr')));
        document.querySelectorAll('.cancel-btn').forEach(b => b.onclick = () => loadCostData());
        document.querySelectorAll('.save-btn').forEach(b => b.onclick = (e) => saveRowChanges(e.target.closest('tr')));
    }

    function toggleEditMode(row, isEditing) {
        row.querySelector('.edit-btn').style.display = !isEditing ? 'inline-block' : 'none';
        row.querySelector('.delete-btn').style.display = !isEditing ? 'inline-block' : 'none';
        row.querySelector('.save-btn').style.display = isEditing ? 'inline-block' : 'none';
        row.querySelector('.cancel-btn').style.display = isEditing ? 'inline-block' : 'none';

        if (isEditing) {
            const numericColumns = ['İşin Bedeli', 'Yapılan Ödeme'];
            row.querySelectorAll('td[data-column]').forEach(cell => {
                const colName = cell.dataset.column;
                if (colName === 'Kalan Bakiye') {
                    cell.style.backgroundColor = '#f0f0f0';
                    return;
                }
                let currentValue = cell.textContent;
                if (numericColumns.includes(colName)) {
                    currentValue = parseCurrency(currentValue);
                }
                cell.innerHTML = `<input type="text" value="${currentValue}" class="edit-input-field" style="width: 95%;">`;
            });
            const liveUpdateHandler = () => updateKalanBakiyeInRow(row);
            row.querySelector('td[data-column="İşin Bedeli"] input')?.addEventListener('input', liveUpdateHandler);
            row.querySelector('td[data-column="Yapılan Ödeme"] input')?.addEventListener('input', liveUpdateHandler);
        }
    }

    function updateKalanBakiyeInRow(row) {
        const isinBedeliInput = row.querySelector('td[data-column="İşin Bedeli"] input');
        const yapilanOdemeInput = row.querySelector('td[data-column="Yapılan Ödeme"] input');
        const kalanBakiyeCell = row.querySelector('td[data-column="Kalan Bakiye"]');

        if (!isinBedeliInput || !yapilanOdemeInput || !kalanBakiyeCell) return;
        const isinBedeli = parseCurrency(isinBedeliInput.value);
        const yapilanOdeme = parseCurrency(yapilanOdemeInput.value);
        const kalanBakiye = isinBedeli - yapilanOdeme;
        kalanBakiyeCell.textContent = formatCurrency(kalanBakiye);
    }

    async function deleteRow(row) {
        const costId = row.dataset.id;
        const altKalem = row.querySelector('td[data-column="Alt Kalem / Açıklama"]').textContent;
        if (!confirm(`${altKalem}' kaydını silmek istediğinize emin misiniz? (Veri kaybolmaz, gizlenir)`)) return;
        try {
            const response = await fetch(`${BASE_URL}/api/costs`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: costId, admin_username: loggedInUser })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || result.message);
            alert(result.message);
            loadCostData();
        } catch (error) {
            alert('Silme sırasında hata: ' + error.message);
        }
    }

    async function saveRowChanges(row) {
        const updated_data = {};
        row.querySelectorAll('td[data-column] input').forEach(input => {
            const column = input.closest('td').dataset.column;
            updated_data[column] = input.value;
        });
        
        try {
            const response = await fetch(`${BASE_URL}/api/costs`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: row.dataset.id,
                    updated_data: updated_data,
                    admin_username: loggedInUser
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || result.message);
            alert(result.message);
            loadCostData();
        } catch (error) {
            alert('Güncelleme sırasında hata: ' + error.message);
        }
    }

    // YENİ EKLENEN FONKSİYON
    async function handleAddNewCost(event) {
        event.preventDefault();
        const payload = {
            is_kalemi: document.getElementById('newIsKalemi').value,
            alt_kalem: document.getElementById('newAltKalem').value,
            isin_bedeli: document.getElementById('newIsinBedeli').value || '0',
            yapilan_odeme: document.getElementById('newYapilanOdeme').value || '0',
            odeme_sekli: document.getElementById('newOdemeSekli').value,
            odeme_tarihi: document.getElementById('newOdemeTarihi').value,
            admin_username: loggedInUser
        };
        
        if (!payload.alt_kalem || !payload.is_kalemi) {
            alert('Lütfen "İş Kalemi" ve "Alt Kalem / Açıklama" alanlarını doldurun.');
            return;
        }

        addCostMessage.style.display = 'block';
        addCostMessage.textContent = 'Kaydediliyor...';
        addCostMessage.style.color = '#3498db';

        try {
            const response = await fetch(`${BASE_URL}/api/costs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || result.error);

            addCostMessage.textContent = result.message;
            addCostMessage.style.color = '#27ae60';
            newCostForm.reset();
            document.getElementById('newIsinBedeli').value = '0';
            document.getElementById('newYapilanOdeme').value = '0';
            await loadCostData();

        } catch (error) {
            addCostMessage.textContent = 'Hata: ' + error.message;
            addCostMessage.style.color = '#e74c3c';
        }
    }
    
    loadCostData();
});