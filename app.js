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
let userPins = {};

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
const meseFilter = document.getElementById('meseFilter');
const themeToggle = document.getElementById('themeToggle');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadChiusureFromFirebase();
    loadPinsFromFirebase();
    loadThemePreference();
    registerServiceWorker();
});

// Service Worker per PWA
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registrato'))
            .catch(err => console.log('Service Worker non registrato', err));
    }
}

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

// Carica PIN personalizzati da Firebase
async function loadPinsFromFirebase() {
    try {
        const doc = await db.collection('settings').doc('pins').get();
        if (doc.exists) {
            userPins = doc.data();
        } else {
            // Inizializza con PIN di default
            userPins = { ...ADMIN_PINS };
            await db.collection('settings').doc('pins').set(userPins);
        }
    } catch (error) {
        console.error('Errore caricamento PIN:', error);
        userPins = { ...ADMIN_PINS };
    }
}

// Tema chiaro/scuro
function loadThemePreference() {
    const theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    themeToggle.innerHTML = isLight ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function initializeApp() {
    // Imposta data odierna nel selettore
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    document.getElementById('chiusuraDate').value = todayStr;
    
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
    
    // Export PDF
    document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
    
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
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Settings modal
    settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
    document.getElementById('closeSettings').addEventListener('click', () => settingsModal.classList.remove('active'));
    settingsModal.addEventListener('click', (e) => {
        if (e.target.id === 'settingsModal') settingsModal.classList.remove('active');
    });
    
    // Change PIN
    document.getElementById('changePinBtn').addEventListener('click', changePin);
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
    
    // Usa PIN personalizzati o default
    const correctPin = userPins[user] || ADMIN_PINS[user];
    
    if (correctPin === pin) {
        currentUser = user;
        loginScreen.classList.remove('active');
        mainScreen.classList.add('active');
        currentUserSpan.textContent = user;
        showToast('Accesso effettuato!', 'success');
        resetForm();
        renderStorico();
        
        // Pietro può vedere solo storico
        if (user === 'PIETRO') {
            document.getElementById('tabChiusura').style.display = 'none';
            switchTab('storico');
        } else {
            document.getElementById('tabChiusura').style.display = 'flex';
        }
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
    // Ripristina tab chiusura visibile per prossimo login
    document.getElementById('tabChiusura').style.display = 'flex';
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
    
    // Usa la data selezionata dall'utente
    const selectedDate = document.getElementById('chiusuraDate').value;
    
    // Se stiamo modificando una chiusura esistente, usa quell'ID
    // Altrimenti controlla se esiste già una chiusura per la data selezionata
    let targetId = editingChiusuraId;
    if (!targetId) {
        const existingIndex = chiusure.findIndex(c => c.data === selectedDate);
        if (existingIndex >= 0) {
            targetId = chiusure[existingIndex].id;
        }
    }
    
    const chiusura = {
        data: selectedDate,
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
    saveChiusuraToFirebase(chiusura, targetId);
}

async function saveChiusuraToFirebase(chiusura, existingId) {
    try {
        if (existingId) {
            // Stiamo modificando? Non chiedere conferma
            if (!editingChiusuraId) {
                // Solo se non stiamo modificando esplicitamente, chiedi conferma
                if (!confirm('Esiste già una chiusura per questa data. Vuoi sovrascriverla?')) {
                    return;
                }
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
    
    // Aggiorna data al selettore
    const today = new Date();
    document.getElementById('chiusuraDate').value = today.toISOString().split('T')[0];
    
    // Reset stato editing
    editingChiusuraId = null;
    const salvaBtn = document.getElementById('salvaChiusura');
    salvaBtn.innerHTML = '<i class="fas fa-save"></i> Salva Chiusura';
    salvaBtn.classList.remove('editing');
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
    
    // Totale differenza mensile
    const totaleDifferenza = filtered.reduce((sum, c) => sum + (c.differenza || 0), 0);
    const diffElement = document.getElementById('totaleDifferenza');
    diffElement.textContent = formatCurrency(totaleDifferenza);
    diffElement.classList.remove('positive', 'negative', 'zero');
    if (totaleDifferenza > 0) {
        diffElement.classList.add('positive');
    } else if (totaleDifferenza < 0) {
        diffElement.classList.add('negative');
    } else {
        diffElement.classList.add('zero');
    }
    
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
        const weekDay = date.toLocaleDateString('it-IT', { weekday: 'short' }).toUpperCase();
        
        return `
            <div class="storico-item" onclick="showDetail('${c.data}')">
                <div class="storico-item-left">
                    <div class="storico-date">
                        <span class="weekday">${weekDay}</span>
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
        <div class="detail-row edit-date-row">
            <span class="detail-label">Data</span>
            <span class="detail-value">${formattedDate}</span>
            <button class="btn-edit-date" onclick="editChiusuraDate('${chiusura.data}')">
                <i class="fas fa-edit"></i> Modifica Data
            </button>
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
        <div class="modal-actions">
            <button class="btn-edit-chiusura" onclick="editChiusura('${chiusura.data}')">
                <i class="fas fa-edit"></i> Modifica Chiusura
            </button>
            <button class="btn-delete-chiusura" onclick="deleteChiusura('${chiusura.data}')">
                <i class="fas fa-trash"></i> Elimina
            </button>
        </div>
    `;
    
    document.getElementById('detailModal').classList.add('active');
}

function closeModal() {
    document.getElementById('detailModal').classList.remove('active');
}

// Modifica data di una chiusura esistente
async function editChiusuraDate(oldDate) {
    const chiusura = chiusure.find(c => c.data === oldDate);
    if (!chiusura) return;
    
    const newDate = prompt('Inserisci la nuova data (formato YYYY-MM-DD):', oldDate);
    if (!newDate || newDate === oldDate) return;
    
    // Verifica formato data
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        showToast('Formato data non valido. Usa YYYY-MM-DD', 'error');
        return;
    }
    
    // Verifica se esiste già una chiusura per quella data
    const existing = chiusure.find(c => c.data === newDate);
    if (existing) {
        if (!confirm(`Esiste già una chiusura per il ${newDate}. Vuoi sovrascriverla?`)) {
            return;
        }
        // Elimina la chiusura esistente
        await db.collection('chiusure').doc(existing.id).delete();
    }
    
    try {
        // Aggiorna la data della chiusura
        await db.collection('chiusure').doc(chiusura.id).update({ data: newDate });
        showToast('Data modificata con successo!', 'success');
        closeModal();
        await loadChiusureFromFirebase();
    } catch (error) {
        console.error('Errore modifica data:', error);
        showToast('Errore nella modifica', 'error');
    }
}

// Variabile per tracciare se stiamo modificando una chiusura esistente
let editingChiusuraId = null;

// Modifica chiusura completa
function editChiusura(data) {
    const chiusura = chiusure.find(c => c.data === data);
    if (!chiusura) return;
    
    // Salva l'ID della chiusura che stiamo modificando
    editingChiusuraId = chiusura.id;
    
    // Chiudi il modal
    closeModal();
    
    // Vai al tab chiusura
    switchTab('chiusura');
    
    // Carica i dati nel form
    document.getElementById('chiusuraDate').value = chiusura.data;
    document.getElementById('fiscale').value = chiusura.fiscale || '';
    document.getElementById('pos1').value = chiusura.pos?.pos1 || '';
    document.getElementById('pos2').value = chiusura.pos?.pos2 || '';
    document.getElementById('bill5').value = chiusura.cash?.bill5 || '';
    document.getElementById('bill10').value = chiusura.cash?.bill10 || '';
    document.getElementById('bill20').value = chiusura.cash?.bill20 || '';
    document.getElementById('bill50').value = chiusura.cash?.bill50 || '';
    document.getElementById('bill100').value = chiusura.cash?.bill100 || '';
    document.getElementById('bill200').value = chiusura.cash?.bill200 || '';
    
    // Carica le spese
    const speseContainer = document.getElementById('speseContainer');
    speseContainer.innerHTML = '';
    if (chiusura.spese && chiusura.spese.length > 0) {
        chiusura.spese.forEach(spesa => {
            const row = document.createElement('div');
            row.className = 'spesa-item';
            row.innerHTML = `
                <input type="text" class="spesa-nota" placeholder="Descrizione spesa..." value="${spesa.nota || ''}">
                <input type="number" class="spesa-importo" step="0.01" placeholder="0.00" value="${spesa.importo || ''}">
                <button class="btn-remove-spesa" onclick="removeSpesa(this)">
                    <i class="fas fa-times"></i>
                </button>
            `;
            speseContainer.appendChild(row);
            row.querySelector('.spesa-importo').addEventListener('input', calculateTotals);
        });
    }
    
    // Aggiorna i totali
    calculateTotals();
    
    // Mostra indicatore che stiamo modificando
    showToast('Modifica chiusura caricata. Salva per confermare le modifiche.', 'info');
    
    // Cambia testo del pulsante salva
    const salvaBtn = document.getElementById('salvaChiusura');
    salvaBtn.innerHTML = '<i class="fas fa-save"></i> Aggiorna Chiusura';
    salvaBtn.classList.add('editing');
}

// Elimina chiusura
async function deleteChiusura(data) {
    const chiusura = chiusure.find(c => c.data === data);
    if (!chiusura) return;
    
    const date = new Date(data);
    const formattedDate = formatDate(date);
    
    if (!confirm(`Sei sicuro di voler eliminare la chiusura del ${formattedDate}?\n\nQuesta azione non può essere annullata.`)) {
        return;
    }
    
    try {
        await db.collection('chiusure').doc(chiusura.id).delete();
        showToast('Chiusura eliminata', 'success');
        closeModal();
        await loadChiusureFromFirebase();
    } catch (error) {
        console.error('Errore eliminazione:', error);
        showToast('Errore durante l\'eliminazione', 'error');
    }
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
    
    let icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    else if (type === 'info') icon = 'info-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
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

// EXPORT PDF FUNCTION
function exportToPDF() {
    const { jsPDF } = window.jspdf;
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
    
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const monthName = monthNames[month - 1];
    
    // Calcola totali
    const totaleMese = filtered.reduce((sum, c) => sum + c.granTotale, 0);
    const totaleFiscale = filtered.reduce((sum, c) => sum + c.fiscale, 0);
    const totaleDifferenza = filtered.reduce((sum, c) => sum + (c.differenza || 0), 0);
    const totalePOS = filtered.reduce((sum, c) => sum + c.pos.totale, 0);
    const totaleContanti = filtered.reduce((sum, c) => sum + c.cash.totale, 0);
    const totaleSpese = filtered.reduce((sum, c) => sum + c.speseTotale, 0);
    
    // Crea PDF
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text('SKALETTE', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text(`Report Chiusure - ${monthName} ${year}`, 105, 30, { align: 'center' });
    
    // Summary box
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, 40, 182, 30, 3, 3, 'F');
    
    doc.text(`Totale Chiusure: ${filtered.length}`, 20, 50);
    doc.text(`Totale Mese: ${formatCurrency(totaleMese)}`, 70, 50);
    doc.text(`Totale Fiscale: ${formatCurrency(totaleFiscale)}`, 130, 50);
    
    doc.text(`Totale POS: ${formatCurrency(totalePOS)}`, 20, 60);
    doc.text(`Totale Contanti: ${formatCurrency(totaleContanti)}`, 70, 60);
    
    // Differenza con colore
    const diffText = `Differenza Totale: ${formatCurrency(totaleDifferenza)}`;
    if (totaleDifferenza > 0) {
        doc.setTextColor(16, 185, 129); // verde
    } else if (totaleDifferenza < 0) {
        doc.setTextColor(239, 68, 68); // rosso
    } else {
        doc.setTextColor(100);
    }
    doc.text(diffText, 130, 60);
    doc.setTextColor(60);
    
    // Tabella dati
    const tableData = filtered.map(c => {
        const date = new Date(c.data);
        const weekDay = date.toLocaleDateString('it-IT', { weekday: 'short' }).toUpperCase();
        const day = date.getDate();
        const monthShort = date.toLocaleDateString('it-IT', { month: 'short' });
        
        return [
            `${weekDay} ${day} ${monthShort}`,
            c.utente,
            formatCurrencySimple(c.fiscale),
            formatCurrencySimple(c.pos.totale),
            formatCurrencySimple(c.cash.totale),
            formatCurrencySimple(c.speseTotale),
            formatCurrencySimple(c.granTotale),
            formatCurrencySimple(c.differenza)
        ];
    });
    
    doc.autoTable({
        startY: 75,
        head: [['Data', 'Operatore', 'Fiscale', 'POS', 'Contanti', 'Spese', 'Totale', 'Diff.']],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: [37, 99, 235],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right' },
            7: { halign: 'right' }
        },
        styles: {
            fontSize: 8,
            cellPadding: 3
        },
        didParseCell: function(data) {
            // Colora la colonna differenza
            if (data.column.index === 7 && data.section === 'body') {
                const value = parseFloat(data.cell.raw.replace('€', '').replace(',', '.').trim());
                if (value > 0) {
                    data.cell.styles.textColor = [16, 185, 129];
                } else if (value < 0) {
                    data.cell.styles.textColor = [239, 68, 68];
                }
            }
        }
    });
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generato il ${new Date().toLocaleDateString('it-IT')} - Pagina ${i} di ${pageCount}`, 105, 290, { align: 'center' });
    }
    
    // Download
    const filename = `Chiusure_Skalette_${monthName}_${year}.pdf`;
    doc.save(filename);
    
    showToast(`PDF esportato: ${filename}`, 'success');
}

// Helper per formattare valuta senza simbolo per tabella
function formatCurrencySimple(amount) {
    return '€ ' + amount.toFixed(2).replace('.', ',');
}

// CHANGE PIN
async function changePin() {
    const currentPinInput = document.getElementById('currentPin').value;
    const newPin = document.getElementById('newPin').value;
    const confirmPin = document.getElementById('confirmPin').value;
    
    // Verifica PIN corrente
    const correctPin = userPins[currentUser] || ADMIN_PINS[currentUser];
    if (currentPinInput !== correctPin) {
        showToast('PIN attuale non corretto', 'error');
        return;
    }
    
    // Verifica nuovo PIN
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
        showToast('Il PIN deve essere di 4 cifre', 'error');
        return;
    }
    
    if (newPin !== confirmPin) {
        showToast('I PIN non coincidono', 'error');
        return;
    }
    
    try {
        // Aggiorna PIN su Firebase
        userPins[currentUser] = newPin;
        await db.collection('settings').doc('pins').set(userPins);
        
        // Reset form
        document.getElementById('currentPin').value = '';
        document.getElementById('newPin').value = '';
        document.getElementById('confirmPin').value = '';
        
        settingsModal.classList.remove('active');
        showToast('PIN aggiornato con successo!', 'success');
    } catch (error) {
        console.error('Errore aggiornamento PIN:', error);
        showToast('Errore nel salvataggio', 'error');
    }
}

// Esponi funzioni globali necessarie per onclick inline
window.removeSpesa = removeSpesa;
window.showDetail = showDetail;
window.editChiusuraDate = editChiusuraDate;
window.editChiusura = editChiusura;
window.deleteChiusura = deleteChiusura;
