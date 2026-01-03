// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCaj0z8RjecxqHD34fU-KOuddKgZs03kJI",
    authDomain: "skalette-5a0a0.firebaseapp.com",
    projectId: "skalette-5a0a0",
    storageBucket: "skalette-5a0a0.firebasestorage.app",
    messagingSenderId: "750623615446",
    appId: "1:750623615446:web:65be2e80342640e0be1c77"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Configurazione PIN per ogni admin (puoi cambiarli)
const ADMIN_PINS = {
    'LUCA': '1111',
    'PIETRO': '2222',
    'ALESSANDRO': '3333'
};

// Stato applicazione
let currentUser = null;
let chiusure = [];

// Elementi DOM
const loginScreen = document.getElementById('loginScreen');
const mainScreen = document.getElementById('mainScreen');
const userButtons = document.querySelectorAll('.user-btn');
const pinContainer = document.querySelector('.pin-input-container');
const selectedUserSpan = document.getElementById('selectedUser');
const pinInput = document.getElementById('pinInput');
const loginBtn = document.getElementById('loginBtn');
const cancelLogin = document.getElementById('cancelLogin');
const currentUserSpan = document.getElementById('currentUser');
const logoutBtn = document.getElementById('logoutBtn');
const tabButtons = document.querySelectorAll('.tab-btn');
const chiusuraTab = document.getElementById('chiusuraTab');
const storicoTab = document.getElementById('storicoTab');
const todayDate = document.getElementById('todayDate');
const meseFilter = document.getElementById('meseFilter');

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadChiusureFromFirebase();
});

// Carica chiusure da Firebase
async function loadChiusureFromFirebase() {
    try {
        const snapshot = await db.collection('chiusure').orderBy('data', 'desc').get();
        chiusure = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderStorico();
    } catch (error) {
        console.error('Errore caricamento dati:', error);
        showToast('Errore connessione database', 'error');
    }
}

function initializeApp() {
    // Imposta data odierna
    const today = new Date();
    todayDate.textContent = formatDate(today);
    
    // Imposta filtro mese corrente
    meseFilter.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    // Event listeners
    setupEventListeners();
    
    // Calcola totali iniziali
    calculateTotals();
}

function setupEventListeners() {
    // Login
    userButtons.forEach(btn => {
        btn.addEventListener('click', () => selectUser(btn.dataset.user));
    });
    
    loginBtn.addEventListener('click', handleLogin);
    cancelLogin.addEventListener('click', resetLogin);
    pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Tabs
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Form inputs per calcolo totali
    document.getElementById('pos1').addEventListener('input', calculateTotals);
    document.getElementById('pos2').addEventListener('input', calculateTotals);
    document.getElementById('bill5').addEventListener('input', calculateTotals);
    document.getElementById('bill10').addEventListener('input', calculateTotals);
    document.getElementById('bill20').addEventListener('input', calculateTotals);
    document.getElementById('bill50').addEventListener('input', calculateTotals);
    document.getElementById('bill100').addEventListener('input', calculateTotals);
    document.getElementById('bill200').addEventListener('input', calculateTotals);
    document.getElementById('fiscale').addEventListener('input', calculateTotals);
    
    // Export CSV
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    
    // Aggiungi spesa
    document.getElementById('addSpesa').addEventListener('click', addSpesaRow);
    
    // Salva chiusura
    document.getElementById('salvaChiusura').addEventListener('click', salvaChiusura);
    
    // Filtro mese
    meseFilter.addEventListener('change', renderStorico);
    
    // Modal
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('detailModal').addEventListener('click', (e) => {
        if (e.target.id === 'detailModal') closeModal();
    });
}

// LOGIN FUNCTIONS
function selectUser(user) {
    selectedUserSpan.textContent = user;
    pinContainer.style.display = 'block';
    document.querySelector('.user-buttons').style.display = 'none';
    pinInput.focus();
}

function handleLogin() {
    const user = selectedUserSpan.textContent;
    const pin = pinInput.value;
    
    if (ADMIN_PINS[user] === pin) {
        currentUser = user;
        loginScreen.classList.remove('active');
        mainScreen.classList.add('active');
        currentUserSpan.textContent = user;
        showToast('Accesso effettuato!', 'success');
        resetForm();
        renderStorico();
    } else {
        showToast('PIN non corretto!', 'error');
        pinInput.value = '';
        pinInput.focus();
    }
}

function resetLogin() {
    pinContainer.style.display = 'none';
    document.querySelector('.user-buttons').style.display = 'flex';
    pinInput.value = '';
}

function handleLogout() {
    currentUser = null;
    mainScreen.classList.remove('active');
    loginScreen.classList.add('active');
    resetLogin();
    resetForm();
    showToast('Logout effettuato', 'success');
}

// TAB FUNCTIONS
function switchTab(tab) {
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    chiusuraTab.classList.toggle('active', tab === 'chiusura');
    storicoTab.classList.toggle('active', tab === 'storico');
    
    if (tab === 'storico') {
        renderStorico();
    }
}

// FORM FUNCTIONS
function calculateTotals() {
    // POS
    const pos1 = parseFloat(document.getElementById('pos1').value) || 0;
    const pos2 = parseFloat(document.getElementById('pos2').value) || 0;
    const posTotale = pos1 + pos2;
    document.getElementById('posTotale').textContent = formatCurrency(posTotale);
    
    // Cash - tutti i tagli
    const bill5 = parseInt(document.getElementById('bill5').value) || 0;
    const bill10 = parseInt(document.getElementById('bill10').value) || 0;
    const bill20 = parseInt(document.getElementById('bill20').value) || 0;
    const bill50 = parseInt(document.getElementById('bill50').value) || 0;
    const bill100 = parseInt(document.getElementById('bill100').value) || 0;
    const bill200 = parseInt(document.getElementById('bill200').value) || 0;
    
    const total5 = bill5 * 5;
    const total10 = bill10 * 10;
    const total20 = bill20 * 20;
    const total50 = bill50 * 50;
    const total100 = bill100 * 100;
    const total200 = bill200 * 200;
    
    document.getElementById('total5').textContent = formatCurrency(total5);
    document.getElementById('total10').textContent = formatCurrency(total10);
    document.getElementById('total20').textContent = formatCurrency(total20);
    document.getElementById('total50').textContent = formatCurrency(total50);
    document.getElementById('total100').textContent = formatCurrency(total100);
    document.getElementById('total200').textContent = formatCurrency(total200);
    
    const cashTotale = total5 + total10 + total20 + total50 + total100 + total200;
    document.getElementById('cashTotale').textContent = formatCurrency(cashTotale);
    
    // Spese
    let speseTotale = 0;
    document.querySelectorAll('.spesa-importo').forEach(input => {
        speseTotale += parseFloat(input.value) || 0;
    });
    document.getElementById('speseTotale').textContent = formatCurrency(speseTotale);
    
    // Gran Totale
    const granTotale = cashTotale + speseTotale + posTotale;
    document.getElementById('granTotale').textContent = formatCurrency(granTotale);
    
    // Differenza
    const fiscale = parseFloat(document.getElementById('fiscale').value) || 0;
    const differenza = granTotale - fiscale;
    const differenzaEl = document.getElementById('differenza');
    differenzaEl.textContent = formatCurrency(differenza);
    
    differenzaEl.classList.remove('positive', 'negative', 'zero');
    if (differenza > 0) {
        differenzaEl.classList.add('positive');
    } else if (differenza < 0) {
        differenzaEl.classList.add('negative');
    } else {
        differenzaEl.classList.add('zero');
    }
}

function addSpesaRow() {
    const container = document.getElementById('speseContainer');
    const row = document.createElement('div');
    row.className = 'spesa-item';
    row.innerHTML = `
        <input type="text" class="spesa-nota" placeholder="Descrizione spesa...">
        <input type="number" class="spesa-importo" step="0.01" placeholder="0.00">
        <button class="btn-remove-spesa" onclick="removeSpesa(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(row);
    
    // Aggiungi event listener per calcolo
    row.querySelector('.spesa-importo').addEventListener('input', calculateTotals);
    row.querySelector('.spesa-nota').focus();
}

function removeSpesa(btn) {
    btn.closest('.spesa-item').remove();
    calculateTotals();
}

function salvaChiusura() {
    const fiscale = parseFloat(document.getElementById('fiscale').value) || 0;
    const pos1 = parseFloat(document.getElementById('pos1').value) || 0;
    const pos2 = parseFloat(document.getElementById('pos2').value) || 0;
    const bill5 = parseInt(document.getElementById('bill5').value) || 0;
    const bill10 = parseInt(document.getElementById('bill10').value) || 0;
    const bill20 = parseInt(document.getElementById('bill20').value) || 0;
    const bill50 = parseInt(document.getElementById('bill50').value) || 0;
    const bill100 = parseInt(document.getElementById('bill100').value) || 0;
    const bill200 = parseInt(document.getElementById('bill200').value) || 0;
    
    // Raccogli spese
    const spese = [];
    document.querySelectorAll('.spesa-item').forEach(item => {
        const nota = item.querySelector('.spesa-nota').value;
        const importo = parseFloat(item.querySelector('.spesa-importo').value) || 0;
        if (nota || importo > 0) {
            spese.push({ nota, importo });
        }
    });
    
    const speseTotale = spese.reduce((sum, s) => sum + s.importo, 0);
    const cashTotale = (bill5 * 5) + (bill10 * 10) + (bill20 * 20) + (bill50 * 50) + (bill100 * 100) + (bill200 * 200);
    const posTotale = pos1 + pos2;
    const granTotale = cashTotale + speseTotale + posTotale;
    
    // Controlla se esiste già una chiusura per oggi
    const today = new Date().toISOString().split('T')[0];
    const existingIndex = chiusure.findIndex(c => c.data === today);
    
    const chiusura = {
        data: today,
        utente: currentUser,
        timestamp: new Date().toISOString(),
        fiscale,
        pos: { pos1, pos2, totale: posTotale },
        cash: {
            bill5,
            bill10,
            bill20,
            bill50,
            bill100,
            bill200,
            totale: cashTotale
        },
        spese,
        speseTotale,
        granTotale,
        differenza: granTotale - fiscale
    };
    
    // Salva su Firebase
    saveChiusuraToFirebase(chiusura, existingIndex >= 0 ? chiusure[existingIndex].id : null);
}

async function saveChiusuraToFirebase(chiusura, existingId) {
    try {
        if (existingId) {
            // Aggiorna esistente
            if (!confirm('Esiste già una chiusura per oggi. Vuoi sovrascriverla?')) {
                return;
            }
            await db.collection('chiusure').doc(existingId).set(chiusura);
        } else {
            // Crea nuova
            await db.collection('chiusure').add(chiusura);
        }
        
        showToast('Chiusura salvata con successo!', 'success');
        await loadChiusureFromFirebase();
        resetForm();
        switchTab('storico');
    } catch (error) {
        console.error('Errore salvataggio:', error);
        showToast('Errore nel salvataggio', 'error');
    }
}

function resetForm() {
    document.getElementById('fiscale').value = '';
    document.getElementById('pos1').value = '';
    document.getElementById('pos2').value = '';
    document.getElementById('bill5').value = '';
    document.getElementById('bill10').value = '';
    document.getElementById('bill20').value = '';
    document.getElementById('bill50').value = '';
    document.getElementById('bill100').value = '';
    document.getElementById('bill200').value = '';
    document.getElementById('speseContainer').innerHTML = '';
    calculateTotals();
    
    // Aggiorna data
    const today = new Date();
    todayDate.textContent = formatDate(today);
}

// STORICO FUNCTIONS
let monthlyChart = null;

function renderStorico() {
    const filterValue = meseFilter.value;
    const [year, month] = filterValue.split('-').map(Number);
    
    const filtered = chiusure.filter(c => {
        const date = new Date(c.data);
        return date.getFullYear() === year && (date.getMonth() + 1) === month;
    });
    
    // Aggiorna summary
    document.getElementById('totaleChiusure').textContent = filtered.length;
    const totaleMese = filtered.reduce((sum, c) => sum + c.granTotale, 0);
    document.getElementById('totaleMese').textContent = formatCurrency(totaleMese);
    
    // Media giornaliera
    const mediaGiornaliera = filtered.length > 0 ? totaleMese / filtered.length : 0;
    document.getElementById('mediaGiornaliera').textContent = formatCurrency(mediaGiornaliera);
    
    // Render grafico
    renderChart(filtered, year, month);
    
    // Render lista
    const list = document.getElementById('storicoList');
    
    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="no-data">
                <i class="fas fa-inbox"></i>
                <p>Nessuna chiusura trovata per questo mese</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = filtered.map(c => {
        const date = new Date(c.data);
        const day = date.getDate();
        const monthName = date.toLocaleDateString('it-IT', { month: 'short' });
        
        return `
            <div class="storico-item" onclick="showDetail('${c.data}')">
                <div class="storico-item-left">
                    <div class="storico-date">
                        <span class="day">${day}</span>
                        <span class="month">${monthName}</span>
                    </div>
                    <div class="storico-info">
                        <span class="user"><i class="fas fa-user"></i> ${c.utente}</span>
                    </div>
                </div>
                <div class="storico-item-right">
                    <div class="storico-total">${formatCurrency(c.granTotale)}</div>
                    <div class="storico-fiscale">Fiscale: ${formatCurrency(c.fiscale)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function showDetail(data) {
    const chiusura = chiusure.find(c => c.data === data);
    if (!chiusura) return;
    
    const date = new Date(chiusura.data);
    const formattedDate = formatDate(date);
    
    let speseHTML = '';
    if (chiusura.spese && chiusura.spese.length > 0) {
        speseHTML = `
            <div class="detail-section">
                <h4><i class="fas fa-file-invoice-dollar"></i> Spese</h4>
                ${chiusura.spese.map(s => `
                    <div class="spesa-detail">
                        <span>${s.nota || 'Spesa senza descrizione'}</span>
                        <span>${formatCurrency(s.importo)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    const differenzaClass = chiusura.differenza > 0 ? 'positive' : (chiusura.differenza < 0 ? 'negative' : 'zero');
    
    // Supporto per vecchi dati (coins) e nuovi (bill5, bill100, bill200)
    const bill5 = chiusura.cash.bill5 || 0;
    const bill100 = chiusura.cash.bill100 || 0;
    const bill200 = chiusura.cash.bill200 || 0;
    
    document.getElementById('modalBody').innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Data</span>
            <span class="detail-value">${formattedDate}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Operatore</span>
            <span class="detail-value">${chiusura.utente}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Fiscale</span>
            <span class="detail-value">${formatCurrency(chiusura.fiscale)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">POS 1</span>
            <span class="detail-value">${formatCurrency(chiusura.pos.pos1)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">POS 2</span>
            <span class="detail-value">${formatCurrency(chiusura.pos.pos2)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Totale POS</span>
            <span class="detail-value">${formatCurrency(chiusura.pos.totale)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Banconote €5 (x${bill5})</span>
            <span class="detail-value">${formatCurrency(bill5 * 5)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Banconote €10 (x${chiusura.cash.bill10})</span>
            <span class="detail-value">${formatCurrency(chiusura.cash.bill10 * 10)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Banconote €20 (x${chiusura.cash.bill20})</span>
            <span class="detail-value">${formatCurrency(chiusura.cash.bill20 * 20)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Banconote €50 (x${chiusura.cash.bill50})</span>
            <span class="detail-value">${formatCurrency(chiusura.cash.bill50 * 50)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Banconote €100 (x${bill100})</span>
            <span class="detail-value">${formatCurrency(bill100 * 100)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Banconote €200 (x${bill200})</span>
            <span class="detail-value">${formatCurrency(bill200 * 200)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Totale Contanti</span>
            <span class="detail-value">${formatCurrency(chiusura.cash.totale)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Totale Spese</span>
            <span class="detail-value">${formatCurrency(chiusura.speseTotale)}</span>
        </div>
        ${speseHTML}
        <div class="detail-gran-total">
            <div class="label">GRAN TOTALE</div>
            <div class="value">${formatCurrency(chiusura.granTotale)}</div>
        </div>
        <div class="detail-row" style="margin-top: 15px;">
            <span class="detail-label">Differenza (Gran Tot - Fiscale)</span>
            <span class="detail-value ${differenzaClass}">${formatCurrency(chiusura.differenza)}</span>
        </div>
    `;
    
    document.getElementById('detailModal').classList.add('active');
}

function closeModal() {
    document.getElementById('detailModal').classList.remove('active');
}

// UTILITY FUNCTIONS
function formatCurrency(amount) {
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

function formatDate(date) {
    return date.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// CHART FUNCTION
function renderChart(data, year, month) {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    
    // Distruggi grafico esistente
    if (monthlyChart) {
        monthlyChart.destroy();
    }
    
    // Ottieni numero giorni nel mese
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Prepara dati per tutti i giorni del mese
    const labels = [];
    const values = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
        labels.push(day);
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const chiusura = data.find(c => c.data === dateStr);
        values.push(chiusura ? chiusura.granTotale : 0);
    }
    
    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Gran Totale',
                data: values,
                backgroundColor: values.map(v => v > 0 ? 'rgba(37, 99, 235, 0.7)' : 'rgba(100, 116, 139, 0.2)'),
                borderColor: values.map(v => v > 0 ? 'rgba(37, 99, 235, 1)' : 'rgba(100, 116, 139, 0.3)'),
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    borderColor: 'rgba(37, 99, 235, 0.5)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 10 }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        callback: function(value) {
                            return '€' + value;
                        }
                    }
                }
            }
        }
    });
}

// EXPORT CSV FUNCTION
function exportToCSV() {
    const filterValue = meseFilter.value;
    const [year, month] = filterValue.split('-').map(Number);
    
    const filtered = chiusure.filter(c => {
        const date = new Date(c.data);
        return date.getFullYear() === year && (date.getMonth() + 1) === month;
    });
    
    if (filtered.length === 0) {
        showToast('Nessun dato da esportare', 'error');
        return;
    }
    
    // Intestazioni CSV
    const headers = [
        'Data',
        'Operatore',
        'Fiscale',
        'POS 1',
        'POS 2',
        'Totale POS',
        'Banconote €5',
        'Banconote €10',
        'Banconote €20',
        'Banconote €50',
        'Banconote €100',
        'Banconote €200',
        'Totale Contanti',
        'Totale Spese',
        'Dettaglio Spese',
        'Gran Totale',
        'Differenza'
    ];
    
    // Righe dati
    const rows = filtered.map(c => {
        const speseDetail = c.spese.map(s => `${s.nota || 'N/A'}: €${s.importo.toFixed(2)}`).join(' | ');
        return [
            c.data,
            c.utente,
            c.fiscale.toFixed(2),
            c.pos.pos1.toFixed(2),
            c.pos.pos2.toFixed(2),
            c.pos.totale.toFixed(2),
            c.cash.bill5 || 0,
            c.cash.bill10,
            c.cash.bill20,
            c.cash.bill50,
            c.cash.bill100 || 0,
            c.cash.bill200 || 0,
            c.cash.totale.toFixed(2),
            c.speseTotale.toFixed(2),
            speseDetail || 'Nessuna',
            c.granTotale.toFixed(2),
            c.differenza.toFixed(2)
        ];
    });
    
    // Aggiungi riga totali
    const totaleMese = filtered.reduce((sum, c) => sum + c.granTotale, 0);
    const totaleFiscale = filtered.reduce((sum, c) => sum + c.fiscale, 0);
    const totalePOS = filtered.reduce((sum, c) => sum + c.pos.totale, 0);
    const totaleContanti = filtered.reduce((sum, c) => sum + c.cash.totale, 0);
    const totaleSpese = filtered.reduce((sum, c) => sum + c.speseTotale, 0);
    
    rows.push([]);
    rows.push([
        'TOTALE MESE',
        '',
        totaleFiscale.toFixed(2),
        '',
        '',
        totalePOS.toFixed(2),
        '',
        '',
        '',
        '',
        '',
        '',
        totaleContanti.toFixed(2),
        totaleSpese.toFixed(2),
        '',
        totaleMese.toFixed(2),
        ''
    ]);
    
    // Crea CSV
    const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
    ].join('\n');
    
    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const filename = `Chiusure_Skalette_${monthNames[month-1]}_${year}.csv`;
    
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    
    showToast(`Esportato: ${filename}`, 'success');
}

// Esponi funzioni globali necessarie per onclick inline
window.removeSpesa = removeSpesa;
window.showDetail = showDetail;
