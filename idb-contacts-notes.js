// Local IndexedDB storage for Contacts and Notes — no server dependencies
var AFT_CONTACTS_DB = 'AFTContacts';
var AFT_NOTES_DB = 'AFTNotes';

function aftOpenContactsDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(AFT_CONTACTS_DB, 1);
    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('contacts')) {
        db.createObjectStore('contacts', { keyPath: 'id' });
      }
    };
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror = function(e) { reject(e.target.error); };
  });
}

function aftIdbGetContacts() {
  return aftOpenContactsDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var items = [];
      var req = db.transaction('contacts', 'readonly').objectStore('contacts').openCursor();
      req.onsuccess = function(e) {
        var c = e.target.result;
        if (c) { items.push(c.value); c.continue(); } else resolve(items);
      };
      req.onerror = function(e) { reject(e.target.error); };
    });
  });
}

function aftIdbSaveContact(contact) {
  return aftOpenContactsDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      if (!contact.id) contact.id = 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      if (!contact.created_at) contact.created_at = new Date().toISOString();
      contact.updated_at = new Date().toISOString();
      var tx = db.transaction('contacts', 'readwrite');
      tx.objectStore('contacts').put(contact);
      tx.oncomplete = function() { resolve(contact); };
      tx.onerror = function(e) { reject(e.target.error); };
    });
  });
}

function aftIdbDeleteContact(id) {
  return aftOpenContactsDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('contacts', 'readwrite');
      tx.objectStore('contacts').delete(id);
      tx.oncomplete = function() { resolve(true); };
      tx.onerror = function(e) { reject(e.target.error); };
    });
  });
}

function aftOpenNotesDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(AFT_NOTES_DB, 1);
    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('notes')) {
        db.createObjectStore('notes', { keyPath: 'id' });
      }
    };
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror = function(e) { reject(e.target.error); };
  });
}

function aftIdbGetNotes() {
  return aftOpenNotesDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var items = [];
      var req = db.transaction('notes', 'readonly').objectStore('notes').openCursor();
      req.onsuccess = function(e) {
        var c = e.target.result;
        if (c) { items.push(c.value); c.continue(); } else resolve(items);
      };
      req.onerror = function(e) { reject(e.target.error); };
    });
  });
}

function aftIdbSaveNote(note) {
  return aftOpenNotesDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      if (!note.id) note.id = 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      if (!note.created_at) note.created_at = new Date().toISOString();
      note.updated_at = new Date().toISOString();
      var tx = db.transaction('notes', 'readwrite');
      tx.objectStore('notes').put(note);
      tx.oncomplete = function() { resolve(note); };
      tx.onerror = function(e) { reject(e.target.error); };
    });
  });
}

function aftIdbDeleteNote(id) {
  return aftOpenNotesDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('notes', 'readwrite');
      tx.objectStore('notes').delete(id);
      tx.oncomplete = function() { resolve(true); };
      tx.onerror = function(e) { reject(e.target.error); };
    });
  });
}
