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
var complaintsListener = null;

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
    if (complaintsListener) complaintsListener();
    complaintsListener = db.ref('complaints').orderByChild('createdAt').on('value', function(snap) {
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

function updateComplaintStatusInFirebase(complaintId, status, adminNote) {
    if (!db) return Promise.reject('DB not initialized');
    var updates = {
        status: status,
        updatedAt: new Date().toISOString()
    };
    if (adminNote) updates.adminNote = adminNote;
    return db.ref('complaints/' + complaintId).update(updates);
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
    var iconMap = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };
    toast.className = 'toast toast-' + (type || 'info');
    toast.innerHTML = (iconMap[type] || iconMap.info) + '<span class="toast-msg">' + message + '</span>';
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

function createComplaintCard(c) {
    var date = c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    var statusClass = 'status-' + (c.status || 'pending');
    return '<div class="complaint-card" onclick="openDetail(\'' + c.id + '\')">' +
        '<div class="card-header">' +
            '<span class="card-id">#' + (c.id || '').slice(-6).toUpperCase() + '</span>' +
            '<span class="card-status ' + statusClass + '">' + (c.status || 'pending') + '</span>' +
        '</div>' +
        '<div class="card-name">' + escapeHtml(c.name || 'Unknown') + '</div>' +
        '<div class="card-subject">' + escapeHtml(c.subject || c.type || 'No subject') + '</div>' +
        '<div class="card-footer">' +
            '<span class="card-date">' + date + '</span>' +
            '<button class="card-copy" onclick="event.stopPropagation();copyText(\'' + escapeAttr(JSON.stringify(c, null, 2)) + '\')">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copy' +
            '</button>' +
        '</div>' +
    '</div>';
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return str.replace(/&/g,'&amp;').replace(/'/g,'&#39;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatDate(iso) {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function getTelegramConfig() {
    var saved = JSON.parse(localStorage.getItem('crickso_admin_settings') || '{}');
    return {
        botToken: saved.telegramBotToken || '',
        chatId: saved.telegramChatId || ''
    };
}

function sendToTelegram(text, imageDataUrl) {
    var config = getTelegramConfig();
    if (!config.botToken || !config.chatId) return Promise.resolve({ ok: false, skip: true });

    if (imageDataUrl) {
        var blob = dataURLtoBlob(imageDataUrl);
        var formData = new FormData();
        formData.append('chat_id', config.chatId);
        formData.append('caption', text);
        formData.append('parse_mode', 'Markdown');
        formData.append('photo', blob, 'image.jpg');
        return fetch('https://api.telegram.org/bot' + config.botToken + '/sendPhoto', {
            method: 'POST',
            body: formData
        }).then(function(r) { return r.json(); });
    }

    return fetch('https://api.telegram.org/bot' + config.botToken + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: config.chatId, text: text, parse_mode: 'Markdown' })
    }).then(function(r) { return r.json(); });
}

function sendComplaintToTelegram(complaint) {
    var config = getTelegramConfig();
    if (!config.botToken || !config.chatId) return;

    var type = complaint.type || 'General';
    var text = '*New Complaint*\n\n' +
        '*Name:* ' + (complaint.name || 'N/A') + '\n' +
        '*Email:* ' + (complaint.email || 'N/A') + '\n' +
        '*Phone:* ' + (complaint.phone || 'N/A') + '\n' +
        '*Type:* ' + type + '\n' +
        '*Subject:* ' + (complaint.subject || 'N/A') + '\n' +
        '*Message:* ' + (complaint.message || 'N/A') + '\n' +
        '*Status:* ' + (complaint.status || 'pending') + '\n' +
        '*Date:* ' + (complaint.createdAt ? new Date(complaint.createdAt).toLocaleString() : new Date().toLocaleString());

    if (complaint.image) {
        sendToTelegram(text, complaint.image);
    } else {
        sendToTelegram(text);
    }
}

function dataURLtoBlob(dataURL) {
    var parts = dataURL.split(',');
    var mime = parts[0].match(/:(.*?);/)[1];
    var b64 = atob(parts[1]);
    var u8 = new Uint8Array(b64.length);
    for (var i = 0; i < b64.length; i++) u8[i] = b64.charCodeAt(i);
    return new Blob([u8], { type: mime });
}

var deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    var installBtn = document.getElementById('installBtn');
    var installAppBtn = document.getElementById('installAppBtn');
    if (installBtn) installBtn.style.display = 'flex';
    if (installAppBtn) installAppBtn.style.display = 'flex';
});

window.addEventListener('appinstalled', function() {
    deferredPrompt = null;
    showToast('App installed successfully', 'success');
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function() {});
}
