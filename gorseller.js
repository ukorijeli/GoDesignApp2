document.addEventListener('DOMContentLoaded', async () => {
    // --- Güvenlik ve Yönlendirme Kontrolleri ---
    const loggedInUser = localStorage.getItem('loggedInUser');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const selectedCustomer = localStorage.getItem('selectedCustomer');

    if (!loggedInUser) {
        window.location.href = 'login.html';
        return;
    }
    
    // Admin değilse ve müşteri seçimi ekranından gelmiyorsa ana sayfaya yönlendir
    const customerForGallery = isAdmin ? (selectedCustomer || loggedInUser) : loggedInUser;
    
    // --- Element Tanımlamaları ---
    const userProfileInitialDiv = document.getElementById('userProfileInitial');
    const logoutButton = document.getElementById('logoutButton');
    const customerNameSpan = document.getElementById('customerName');
    const uploadSection = document.getElementById('uploadSection');
    const uploadForm = document.getElementById('uploadForm');
    const galleryGrid = document.getElementById('galleryGrid');
    const uploadMessage = document.getElementById('uploadMessage');

    // --- Header ve Çıkış Butonu Mantığı ---
    if (loggedInUser) {
        userProfileInitialDiv.textContent = loggedInUser.charAt(0).toUpperCase();
        logoutButton.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }

    customerNameSpan.textContent = customerForGallery;

    // --- Adminlere Özel Fonksiyonların Kurulumu ---
    if (isAdmin) {
        uploadSection.style.display = 'block';
        uploadForm.addEventListener('submit', handleUpload);
    }

    // --- Ana Fonksiyonlar ---
    async function loadGorseller() {
        galleryGrid.innerHTML = '<p>Görseller yükleniyor...</p>';
        try {
            const response = await fetch(`${BASE_URL}/api/gorseller/${customerForGallery}`);
            if (!response.ok) throw new Error('Görseller yüklenemedi.');
            
            const gorseller = await response.json();
            galleryGrid.innerHTML = ''; // Temizle

            if (gorseller.length === 0) {
                galleryGrid.innerHTML = `<p>'${customerForGallery}' için henüz yüklenmiş bir görsel veya video bulunmamaktadır.</p>`;
                return;
            }

            gorseller.forEach(g => {
                const itemContainer = document.createElement('div');
                itemContainer.className = 'gallery-item';

                let mediaElement;
                if (g.file_type === 'image') {
                    mediaElement = `<a data-fancybox="gallery" href="${g.url}" data-caption="${g.caption || ''}">
                                      <img src="${g.url}" alt="${g.caption || ''}">
                                   </a>`;
                } else { // video
                    mediaElement = `<a data-fancybox="gallery" href="${g.url}" data-caption="${g.caption || ''}">
                                      <video muted loop playsinline preload="metadata">
                                          <source src="${g.url}#t=0.5" type="video/mp4">
                                      </video>
                                      <img src="1630610815624.jpg" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; opacity:0;" />
                                   </a>`;
                }
                
                let captionElement = g.caption ? `<div class="caption">${g.caption}</div>` : '';
                
                let deleteButton = isAdmin ? `<button class="delete-media-btn" data-id="${g.id}">&times;</button>` : '';

                itemContainer.innerHTML = mediaElement + captionElement + deleteButton;
                galleryGrid.appendChild(itemContainer);
            });

            // Fancybox'ı etkinleştir
            $('[data-fancybox="gallery"]').fancybox({
                buttons: ["zoom", "slideShow", "fullScreen", "download", "thumbs", "close"],
            });
            
            // Silme butonlarına event listener ekle
            if(isAdmin) {
                document.querySelectorAll('.delete-media-btn').forEach(btn => {
                    btn.addEventListener('click', handleDelete);
                });
            }

        } catch (error) {
            galleryGrid.innerHTML = `<p style="color:red;">${error.message}</p>`;
        }
    }

    async function handleUpload(event) {
        event.preventDefault();
        const formData = new FormData();
        formData.append('file', document.getElementById('fileInput').files[0]);
        formData.append('caption', document.getElementById('captionInput').value);
        formData.append('admin_username', loggedInUser);
        formData.append('customer_username', customerForGallery);

        uploadMessage.style.display = 'block';
        uploadMessage.textContent = 'Yükleniyor...';
        uploadMessage.style.color = '#3498db';

        try {
            const response = await fetch(`${BASE_URL}/api/gorseller`, {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            uploadMessage.textContent = result.message;
            uploadMessage.style.color = '#27ae60';
            uploadForm.reset();
            await loadGorseller();

        } catch (error) {
            uploadMessage.textContent = 'Hata: ' + error.message;
            uploadMessage.style.color = '#e74c3c';
        }
    }
    
    async function handleDelete(event) {
        const gorselId = event.target.dataset.id;
        if (!confirm('Bu görseli kalıcı olarak silmek istediğinize emin misiniz?')) return;

        try {
            const response = await fetch(`${BASE_URL}/api/gorseller/${gorselId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ admin_username: loggedInUser })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            alert(result.message);
            await loadGorseller();

        } catch (error) {
            alert('Silme sırasında hata: ' + error.message);
        }
    }

    // Sayfa yüklendiğinde görselleri yükle
    await loadGorseller();
});
