const firebaseConfig = {
  apiKey: "AIzaSyDmRdzAUm-OsTTrxRW4f585VZ2Wq5CAs3w",
  authDomain: "yusub-bhai-croor-bet.firebaseapp.com",
  databaseURL: "https://yusub-bhai-croor-bet-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "yusub-bhai-croor-bet",
  storageBucket: "yusub-bhai-croor-bet.firebasestorage.app",
  messagingSenderId: "998570774789",
  appId: "1:998570774789:web:18c14c5c447af3121ba76c"
};

let db = null;
let complaintsListener = null;

function initFirebase() {
  if (typeof firebase !== 'undefined' && firebase.database) {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    return true;
  }
  return false;
}

// Complaints CRUD
function saveComplaintToFirebase(complaint) {
  if (!db) return Promise.reject('DB not initialized');
  const ref = db.ref('complaints').push();
  complaint.id = ref.key;
  complaint.createdAt = new Date().toISOString();
  complaint.status = complaint.status || 'pending';
  return ref.set(complaint);
}

function syncComplaintsFromFirebase(callback) {
  if (!db) return;
  if (complaintsListener) complaintsListener();
  complaintsListener = db.ref('complaints').orderByChild('createdAt').on('value', snap => {
    const data = snap.val() || {};
    const list = Object.keys(data).map(k => ({ ...data[k], id: k }));
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    callback(list);
  });
}

function getComplaintsFromFirebase() {
  if (!db) return Promise.resolve([]);
  return db.ref('complaints').orderByChild('createdAt').once('value').then(snap => {
    const data = snap.val() || {};
    const list = Object.keys(data).map(k => ({ ...data[k], id: k }));
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  });
}

function updateComplaintStatusInFirebase(complaintId, status, adminNote) {
  if (!db) return Promise.reject('DB not initialized');
  const updates = {
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

// Users
function getUsersFromFirebase() {
  if (!db) return Promise.resolve([]);
  return db.ref('users').once('value').then(snap => {
    const data = snap.val() || {};
    return Object.keys(data).map(k => ({ ...data[k], uid: k }));
  });
}

// Toast
function showToast(message, type) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  const iconMap = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
  };
  toast.className = 'toast toast-' + (type || 'info');
  toast.innerHTML = (iconMap[type] || iconMap.info) + '<span class="toast-msg">' + message + '</span>';
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// Copy
function copyText(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard', 'success'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copied to clipboard', 'success');
  }
}

function copyField(fieldId) {
  const el = document.getElementById(fieldId);
  if (el) copyText(el.textContent.trim());
}

// Complaint Card HTML
function createComplaintCard(c) {
  const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const statusClass = 'status-' + (c.status || 'pending');
  return '<div class="complaint-card" data-id="' + c.id + '" onclick="openComplaintDetail(\'' + c.id + '\')">' +
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
  const div = document.createElement('div');
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

// PWA Install
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  showToast('App installed successfully', 'success');
});

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
