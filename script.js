 
document.addEventListener('DOMContentLoaded', async () => {

    // --- Güvenlik ve Yönlendirme Kontrolleri ---

    const loggedInUser = localStorage.getItem('loggedInUser');

    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    const selectedCustomer = localStorage.getItem('selectedCustomer');



    if (!loggedInUser) {

        window.location.href = 'login.html';

        return;

    }

    

    if (isAdmin && !selectedCustomer) {

        window.location.href = 'musteri_secimi.html';

        return;

    }



    const userToFetch = isAdmin ? selectedCustomer : loggedInUser;



    // --- Element Tanımlamaları ---

    const userProfileInitialDiv = document.getElementById('userProfileInitial');

    const logoutButton = document.getElementById('logoutButton');

    const customerInfoBar = document.getElementById('customer-info-bar');

    const addTaskSection = document.getElementById('addTaskSection');

    const newTaskTableBody = document.querySelector('#newTaskTable tbody');

    const addRowButton = document.getElementById('addRowButton');

    const addTasksButton = document.getElementById('addTasksButton');

    const addTasksMessage = document.getElementById('addTasksMessage');

    const taskListElement = document.getElementById('taskList');

    const overallProgressText = document.getElementById('overall-progress-percentage');

    const progressBarCircle = document.querySelector('.progress-circle .progress-bar');

    const progressTextCircle = document.querySelector('.progress-circle .progress-text');

    const exportAllBtn = document.getElementById('exportAllBtn');



    // --- Header ve Çıkış Butonu Mantığı ---

    if (loggedInUser && userProfileInitialDiv) {

        userProfileInitialDiv.textContent = loggedInUser.charAt(0).toUpperCase();

    }

    

// ... mevcut kodlar ...

if (logoutButton) {

    logoutButton.addEventListener('click', () => {

        localStorage.clear();

        window.location.href = 'login.html';

    });

}



// --- YENİ: İŞ DURUMU KARTINA TIKLAYINCA KAYDIRMA ---

const jobStatusChart = document.getElementById('jobStatusChartContainer');

const taskListSection = document.getElementById('taskList');



// Elementlerin sayfada var olduğundan emin ol

if (jobStatusChart && taskListSection) {

    jobStatusChart.addEventListener('click', () => {

        // taskListSection'a yumuşak bir şekilde kaydır

        taskListSection.scrollIntoView({

            behavior: 'smooth',

            block: 'start'

        });

    });

}




    // --- Adminlere Özel Fonksiyonların Kurulumu ---

    // Bu fonksiyonlar null kontrolleri içerir, böylece sadece index.html'de çalışırlar.

    if (isAdmin) {

        if (customerInfoBar) {

            document.getElementById('selectedCustomerName').textContent = selectedCustomer;

            customerInfoBar.style.display = 'flex';

            document.getElementById('changeCustomerBtn').addEventListener('click', () => {

                localStorage.removeItem('selectedCustomer');

                window.location.href = 'musteri_secimi.html';

            });

        }

        if (addTaskSection) {

            addTaskSection.style.display = 'block'; 

            if(addRowButton) addRowButton.addEventListener('click', addRow);

            if(addTasksButton) addTasksButton.addEventListener('click', addMultipleTasks);

            addRow(); // İlk satırı ekle

        }

        if (exportAllBtn) {

            exportAllBtn.style.display = 'inline-block';

            exportAllBtn.addEventListener('click', () => {

                if (userToFetch) {

                    window.location.href = `${BASE_URL}/api/export-all/${userToFetch}`;

                } else {

                    alert('Rapor oluşturulacak bir müşteri seçilmedi.');

                }

            });

        }

    } else {

        if(addTaskSection) addTaskSection.style.display = 'none';

    }



    // --- Çoklu Görev Ekleme Fonksiyonları (Admin için) ---

    function addRow() {

        if (!newTaskTableBody) return;

        const newRow = newTaskTableBody.insertRow();

        newRow.innerHTML = `

            <td><input type="text" class="task-name-input" placeholder="Görev Adı" style="width: 95%; padding: 5px;"></td>

            <td><input type="number" class="task-progress-input" min="0" max="100" value="0" style="width: 95%; padding: 5px;"></td>

            <td><button class="admin-button delete-row-button delete">Sil</button></td>

        `;

        newRow.querySelector('.delete-row-button').addEventListener('click', () => {

            newRow.remove();

            if (newTaskTableBody.rows.length === 0) {

                addRow(); 

            }

        });

    }



    async function addMultipleTasks() {

        const tasksToSubmit = [];

        let hasError = false;



        Array.from(newTaskTableBody.rows).forEach(row => {

            const nameInput = row.querySelector('.task-name-input');

            const progressInput = row.querySelector('.task-progress-input');

            const taskName = nameInput.value.trim();

            const taskProgress = parseInt(progressInput.value, 10);



            if (taskName && !isNaN(taskProgress) && taskProgress >= 0 && taskProgress <= 100) {

                tasksToSubmit.push({ name: taskName, progress: taskProgress });

            } else if (taskName || (progressInput.value && progressInput.value !== '0')) {

                addTasksMessage.textContent = 'Lütfen tüm alanları geçerli şekilde doldurun (ilerleme 0-100 arası olmalı).';

                addTasksMessage.style.color = '#e74c3c';

                addTasksMessage.style.display = 'block';

                hasError = true;

            }

        });



        if (hasError || tasksToSubmit.length === 0) return;



        for (const task of tasksToSubmit) {

            try {

                const response = await fetch('${BASE_URL}/api/tasks', {

                    method: 'POST',

                    headers: { 'Content-Type': 'application/json' },

                    body: JSON.stringify({

                        username: loggedInUser,

                        customerUsername: selectedCustomer,

                        name: task.name,

                        progress: task.progress

                    })

                });

                if (!response.ok) throw new Error('Görev eklenemedi');

            } catch (error) {

                console.error('Görev ekleme hatası:', error);

            }

        }

        

        addTasksMessage.textContent = `${tasksToSubmit.length} görev başarıyla eklendi.`;

        addTasksMessage.style.color = '#27ae60';

        addTasksMessage.style.display = 'block';

        await renderTasks();

        while(newTaskTableBody.rows.length > 0) newTaskTableBody.deleteRow(0);

        addRow();

    }



    // --- Ana Görevleri Listeleyen Fonksiyon ---

    async function renderTasks() {

        if(!taskListElement) return; // Element yoksa durdur.

        

        taskListElement.innerHTML = '';

        let tasks = [];

        try {

            const response = await fetch(`${BASE_URL}/api/tasks/${userToFetch}`);

            if (!response.ok) throw new Error('Görevler yüklenemedi');

            tasks = await response.json();

        } catch (error) {

            taskListElement.innerHTML = '<p style="color: #e74c3c;">Görevler yüklenemedi.</p>';

            return;

        }



        if (tasks.length === 0) {

            taskListElement.innerHTML = `<p style="color: #777;">'${userToFetch}' için görev bulunmamaktadır.</p>`;

            if (overallProgressText) overallProgressText.textContent = '0.00';

            if (progressBarCircle) progressBarCircle.style.background = `conic-gradient(#eee 0% 100%)`;

            if (progressTextCircle) progressTextCircle.textContent = `0%`;

            return;

        }



        let totalProgressSum = 0;

        tasks.forEach(task => {

            totalProgressSum += task.progress;

            const taskItem = document.createElement('div');

            taskItem.classList.add('task-item');

            if (isAdmin) {

                taskItem.classList.add('admin-clickable');

                taskItem.addEventListener('click', (event) => {

                     if (!event.target.closest('button')) {

                        window.location.href = `detay.html?taskId=${task.id}&taskName=${encodeURIComponent(task.name)}&user=${encodeURIComponent(userToFetch)}`;

                     }

                });

            }

            taskItem.innerHTML = `<div class="task-name">${task.name}</div><div class="progress-bar-horizontal-container"><div class="progress-bar-horizontal" style="width: ${task.progress}%;"></div></div><div class="task-percentage">${task.progress}%</div>`;

            taskListElement.appendChild(taskItem);

        });

        

        const overallAverageProgress = (tasks.length > 0) ? (totalProgressSum / tasks.length) : 0;

        if (overallProgressText) overallProgressText.textContent = overallAverageProgress.toFixed(2);

        if (progressBarCircle) progressBarCircle.style.background = `conic-gradient(#2ecc71 0% ${overallAverageProgress}%, #e0e0e0 ${overallAverageProgress}% 100%)`;

        if (progressTextCircle) progressTextCircle.textContent = `${Math.round(overallAverageProgress)}%`;

    }

    

    // --- Ödeme Durumu Grafiğini Dolduran Fonksiyon ---

// script.js dosyasındaki updatePaymentChart fonksiyonunun yeni hali

// Hata ayıklama modundaki updatePaymentChart fonksiyonu



async function updatePaymentChart() {

    console.log("--- updatePaymentChart fonksiyonu başlatıldı. ---");



    // Adım 1: HTML elementlerini bulmaya çalışalım

    const paymentCircleBar = document.querySelector('#payment-progress-circle .progress-bar');

    console.log("paymentCircleBar elementi bulundu mu?:", paymentCircleBar ? "Evet" : "Hayır");



    const totalAmountText = document.getElementById('payment-total-amount');

    console.log("payment-total-amount elementi bulundu mu?:", totalAmountText ? "Evet" : "Hayır");



    // Adım 2: Fonksiyonun devam edip etmeyeceğini kontrol edelim

    if (!totalAmountText && !paymentCircleBar) {

        console.error("KRİTİK HATA: Gerekli ana HTML elementleri bulunamadı. Fonksiyon durduruldu.");

        return; 

    }

    console.log("Ana elementler bulundu, fonksiyona devam ediliyor.");



    const paidAmountText = document.getElementById('payment-paid-amount');

    const remainingAmountText = document.getElementById('payment-remaining-amount');



    function formatCurrency(number) {

        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(number || 0);

    }



    try {

        console.log("Adım 3: try bloğuna girildi. API'ye istek hazırlanıyor.");

        const url = `http://127.0.0.1:5000/api/costs/summary?v=${new Date().getTime()}`;

        console.log("Adım 4: API'ye istek gönderiliyor: " + url);

        

        const response = await fetch(url);

        console.log("Adım 5: API'den yanıt alındı. HTTP Durum Kodu: " + response.status);



        if (!response.ok) {

            throw new Error(`Sunucu hatası: ${response.status}`);

        }

        

        const data = await response.json();

        console.log("Adım 6: API'den gelen veri:", data);



        // Adım 7: HTML'i güncellemeye başla

        console.log("Adım 7: HTML elementleri yeni veriyle güncelleniyor...");

        if (totalAmountText) totalAmountText.textContent = formatCurrency(data.total);

        if (paidAmountText) paidAmountText.textContent = formatCurrency(data.paid);

        if (remainingAmountText) remainingAmountText.textContent = formatCurrency(data.remaining);

        

        if (paymentCircleBar) {

            const paymentCircleText = document.querySelector('#payment-progress-circle .progress-text');

            const percentage = (data.total > 0) ? ((data.paid / data.total) * 100) : 0;

            paymentCircleBar.style.background = `conic-gradient(#3498db 0% ${percentage}%, #e0e0e0 ${percentage}% 100%)`;

            if(paymentCircleText) paymentCircleText.textContent = `${percentage.toFixed(2)}%`;

        }

        console.log("--- GÜNCELLEME TAMAMLANDI! ---");



    } catch (error) {

        console.error("--- CATCH BLOĞUNDA HATA YAKALANDI ---", error);

        if(totalAmountText) totalAmountText.textContent = "Hata";

        if(paidAmountText) paidAmountText.textContent = "Hata";

        if(remainingAmountText) remainingAmountText.textContent = "Hata";

    }

}



    // --- SAYFA YÜKLENDİĞİNDE VE AKTİF OLDUĞUNDA ÇALIŞACAK FONKSİYONLAR ---

    function refreshAllData() {

        console.log("Sayfa verileri yenileniyor...");

        renderTasks();

        updatePaymentChart();

    }

    

    // Sayfa ilk yüklendiğinde verileri çek

    refreshAllData();



    // Sayfa sekmesine geri dönüldüğünde (focus olduğunda) verileri tekrar çek

    window.addEventListener('focus', refreshAllData);

});