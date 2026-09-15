# 🍸 SKALETTE & AMMIRAGLIO - Sistema Chiusure Giornaliere

App web per la gestione delle chiusure giornaliere di due bar: **Skalette** e **Ammiraglio**.

## Funzionalità

### 🔐 Accesso Admin
- Ogni utente è assegnato a un locale ed entra direttamente nella sua sezione:
  - **Skalette**: SILVIA, SOFIA, FEDERICO
  - **Ammiraglio**: ANDREA, JONATHAN
  - **PIETRO** gestisce entrambi i locali e può passare dall'uno all'altro con il selettore in alto
- Autenticazione con PIN

### 💰 Nuova Chiusura
- **Fiscale**: Totale fiscale giornaliero
- **POS**: POS1 + POS2 con calcolo automatico
- **Contanti**: Banconote €5, €10, €20, €50, €100, €200
- **Spese**: Aggiungi spese con nota e importo
- **Gran Totale**: Somma automatica (Contanti + Spese + POS)
- **Differenza**: Gran Totale - Fiscale

### 📊 Storico & Statistiche
- Grafico andamento mensile
- Media giornaliera
- Filtro per mese
- Dettaglio completo di ogni chiusura
- Export CSV per commercialista

## Come Usare

1. Apri `index.html` nel browser
2. Seleziona il tuo nome
3. Inserisci il PIN
4. Compila i dati della chiusura
5. Clicca "Salva Chiusura"

## PIN Default
- SILVIA: `1111`
- PIETRO: `2222`
- ANDREA: `3333`
- JONATHAN: `4444`
- SOFIA: `5555`
- FEDERICO: `6666`

I PIN possono essere modificati nel file `app.js`.

## Tecnologie
- HTML5, CSS3, JavaScript
- Chart.js per i grafici
- LocalStorage per salvare i dati
