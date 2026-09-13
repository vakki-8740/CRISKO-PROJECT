var firebaseConfig = {
    apiKey: "AIzaSyDmRdzAUm-OsTTrxRW4f585VZ2Wq5CAs3w",
    authDomain: "yusub-bhai-croor-bet.firebaseapp.com",
    databaseURL: "https://yusub-bhai-croor-bet-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "yusub-bhai-croor-bet",
    storageBucket: "yusub-bhai-croor-bet.firebasestorage.app",
    messagingSenderId: "998570774789",
    appId: "1:998570774789:web:18c14c5c447af3121ba76c"
};

var db = null;

function initFirebase() {
    if (typeof firebase !== 'undefined' && firebase.database) {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        return true;
    }
    return false;
}

function saveComplaintToFirebase(complaint) {
    if (!db) return Promise.reject('DB not initialized');
    var ref = db.ref('complaints').push();
    complaint.id = ref.key;
    complaint.createdAt = new Date().toISOString();
    complaint.status = complaint.status || 'pending';
    return ref.set(complaint);
}

function syncComplaintsFromFirebase(callback) {
    if (!db) return;
    db.ref('complaints').orderByChild('createdAt').on('value', function(snap) {
        var data = snap.val() || {};
        var list = Object.keys(data).map(function(k) {
            return Object.assign({}, data[k], { id: k });
        });
        list.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
        callback(list);
    });
}

function getComplaintsFromFirebase() {
    if (!db) return Promise.resolve([]);
    return db.ref('complaints').orderByChild('createdAt').once('value').then(function(snap) {
        var data = snap.val() || {};
        var list = Object.keys(data).map(function(k) {
            return Object.assign({}, data[k], { id: k });
        });
        list.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
        return list;
    });
}

function updateComplaintStatusInFirebase(complaintId, status) {
    if (!db) return Promise.reject('DB not initialized');
    return db.ref('complaints/' + complaintId).update({
        status: status,
        updatedAt: new Date().toISOString()
    });
}

function deleteComplaintFromFirebase(complaintId) {
    if (!db) return Promise.reject('DB not initialized');
    return db.ref('complaints/' + complaintId).remove();
}

function getUsersFromFirebase() {
    if (!db) return Promise.resolve([]);
    return db.ref('users').once('value').then(function(snap) {
        var data = snap.val() || {};
        return Object.keys(data).map(function(k) {
            return Object.assign({}, data[k], { uid: k });
        });
    });
}

function showToast(message, type) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.className = 'toast toast-' + (type || 'info');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

function copyText(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
            showToast('Copied!', 'success');
        });
    } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Copied!', 'success');
    }
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(iso) {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function getTelegramConfig() {
    var saved = JSON.parse(localStorage.getItem('crickso_admin_settings') || '{}');
    return { botToken: saved.telegramBotToken || '', chatId: saved.telegramChatId || '' };
}

function sendToTelegram(text) {
    var config = getTelegramConfig();
    if (!config.botToken || !config.chatId) return Promise.resolve({ ok: false, skip: true });
    return fetch('https://api.telegram.org/bot' + config.botToken + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: config.chatId, text: text, parse_mode: 'Markdown' })
    }).then(function(r) { return r.json(); });
}

function sendComplaintToTelegram(complaint) {
    var config = getTelegramConfig();
    if (!config.botToken || !config.chatId) return;
    var text = '*New Complaint*\n\n*Name:* ' + (complaint.name || 'N/A') + '\n*Email:* ' + (complaint.email || 'N/A') + '\n*Phone:* ' + (complaint.phone || 'N/A') + '\n*Type:* ' + (complaint.type || 'N/A') + '\n*Status:* ' + (complaint.status || 'pending');
    sendToTelegram(text);
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function() {});
}
