// shared.js
document.addEventListener('DOMContentLoaded', () => {

    // Para birimi formatlama fonksiyonu
    function formatCurrency(number) {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(number);
    }

    // Header'daki maliyet özetini getiren ve gösteren fonksiyon
// shared.js dosyasındaki fetchAndDisplayCostSummary fonksiyonunu bulun ve güncelleyin

async function fetchAndDisplayCostSummary() {
    const summaryContainer = document.getElementById('cost-summary-header');
    // Eğer özet konteyneri sayfada yoksa, hiçbir şey yapma
    if (!summaryContainer) return;

    const headerTotal = document.getElementById('header-total');
    const headerPaid = document.getElementById('header-paid');
    const headerRemaining = document.getElementById('header-remaining');

    try {
        const response = await fetch(`${BASE_URL}/api/costs/summary`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Özet verileri alınamadı');
        }

        // Başarılı olursa görünür yap
        summaryContainer.style.display = 'flex';
        headerTotal.textContent = formatCurrency(data.total);
        headerPaid.textContent = formatCurrency(data.paid);
        headerRemaining.textContent = formatCurrency(data.remaining);

    } catch (error) {
        console.error('Header maliyet özeti yüklenirken hata:', error);
        // Hata olursa tüm özet alanını gizle
        summaryContainer.style.display = 'none';
    }
}

    fetchAndDisplayCostSummary();
});
