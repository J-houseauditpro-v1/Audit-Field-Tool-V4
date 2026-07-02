// Contacts tab — local IndexedDB only, no server
var aftContactsData = [];
var aftContactFilter = '';
var aftContactSearch = '';
var aftContactsInitialized = false;

function aftEsc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function aftBuildTrustDots(level) {
  var dots = '';
  for (var i = 1; i <= 5; i++) {
    dots += '<span class="trust-dot ' + (i <= level ? 'filled' : '') + '">●</span>';
  }
  return '<div class="trust-dots">' + dots + '</div>';
}

function aftUpdateTrustDots(level) {
  document.querySelectorAll('#cf-trust-dots .trust-dot').forEach(function(d) {
    d.classList.toggle('filled', parseInt(d.dataset.val, 10) <= level);
  });
  var hiddenInput = document.getElementById('cf-trust');
  if (hiddenInput) hiddenInput.value = level;
}

function loadAftContacts() {
  var list = document.getElementById('contact-list');
  if (!list) return;
  list.innerHTML = '<div class="empty-msg">Loading...</div>';
  aftIdbGetContacts().then(function(contacts) {
    aftContactsData = contacts || [];
    if (aftContactSearch) {
      var q = aftContactSearch.toLowerCase();
      aftContactsData = aftContactsData.filter(function(c) {
        return (c.name || '').toLowerCase().indexOf(q) !== -1 ||
               (c.phone || '').indexOf(q) !== -1 ||
               (c.how_met || '').toLowerCase().indexOf(q) !== -1 ||
               (c.notes || '').toLowerCase().indexOf(q) !== -1;
      });
    }
    renderAftContactList();
  }).catch(function(e) {
    list.innerHTML = '<div class="empty-msg">⚠️ ' + (e.message || 'Error loading contacts') + '</div>';
  });
}

function renderAftContactList() {
  var list = document.getElementById('contact-list');
  if (!list) return;
  var filtered = aftContactsData;
  if (aftContactFilter) {
    filtered = aftContactsData.filter(function(c) {
      return (c.relationship_type || '').toLowerCase() === aftContactFilter.toLowerCase();
    });
  }
  if (!filtered.length) {
    list.innerHTML = '<div class="empty-msg">' + (aftContactFilter || aftContactSearch ? 'No matches' : 'No contacts yet — tap + New') + '</div>';
    return;
  }
  list.innerHTML = '';
  filtered.forEach(function(c) {
    var card = document.createElement('div');
    card.className = 'contact-card';
    var tags = (c.tags || []).slice(0, 3).map(function(t) { return '<span class="contact-tag">' + aftEsc(t) + '</span>'; }).join('');
    var potentialBadge = c.business_potential && c.business_potential !== 'none' ?
      '<span class="badge-potential">' + aftEsc(c.business_potential) + '</span>' : '';
    card.innerHTML =
      '<div class="contact-name">' + aftEsc(c.name) + '</div>' +
      '<div class="contact-type">' + aftEsc(c.relationship_type || '') + ' ' + potentialBadge + '</div>' +
      (c.phone ? '<div class="contact-meta">📞 <a href="tel:' + aftEsc(c.phone) + '">' + aftEsc(c.phone) + '</a></div>' : '') +
      (c.how_met ? '<div class="contact-meta">' + aftEsc(c.how_met) + '</div>' : '') +
      aftBuildTrustDots(c.trust_level || 0) +
      (tags ? '<div class="contact-tags">' + tags + '</div>' : '');
    card.addEventListener('click', function() { showAftContactDetail(c.id); });
    list.appendChild(card);
  });
}

function showAftContactDetail(id) {
  aftIdbGetContacts().then(function(contacts) {
    var c = contacts.find(function(x) { return x.id === id; });
    if (!c) return;
    var list = document.getElementById('contact-list');
    var detail = document.getElementById('contact-detail');
    var form = document.getElementById('contact-form');
    if (list) list.style.display = 'none';
    if (form) form.style.display = 'none';
    if (!detail) return;
    detail.style.display = 'block';
    var tags = (c.tags || []).map(function(t) { return '<span class="contact-tag">' + aftEsc(t) + '</span>'; }).join('');
    detail.innerHTML =
      '<section class="card">' +
        '<button class="btn-sm" id="contact-detail-back" style="margin-bottom:10px;">← Back</button>' +
        '<div class="card-title">' + aftEsc(c.name) + '</div>' +
        aftBuildTrustDots(c.trust_level || 0) +
        (c.relationship_type ? '<div class="card-sub">Relationship: ' + aftEsc(c.relationship_type) + '</div>' : '') +
        (c.how_met ? '<div class="card-sub">How we met: ' + aftEsc(c.how_met) + '</div>' : '') +
        (c.phone ? '<div class="card-sub">Phone: <a href="tel:' + aftEsc(c.phone) + '">' + aftEsc(c.phone) + '</a></div>' : '') +
        (c.email ? '<div class="card-sub">Email: ' + aftEsc(c.email) + '</div>' : '') +
        (c.notes ? '<div class="card-sub" style="white-space:pre-wrap;">' + aftEsc(c.notes) + '</div>' : '') +
        (tags ? '<div class="contact-tags" style="margin-top:8px;">' + tags + '</div>' : '') +
        '<div style="display:flex;gap:8px;margin-top:12px;">' +
          '<button class="btn-gold btn-full" id="contact-detail-edit">✏️ Edit</button>' +
          '<button class="btn-danger-sm" id="contact-detail-delete">🗑</button>' +
        '</div>' +
      '</section>';
    document.getElementById('contact-detail-back').addEventListener('click', function() {
      detail.style.display = 'none';
      if (list) list.style.display = 'block';
      loadAftContacts();
    });
    document.getElementById('contact-detail-edit').addEventListener('click', function() {
      detail.style.display = 'none';
      showAftContactForm('edit', c);
    });
    document.getElementById('contact-detail-delete').addEventListener('click', function() {
      if (!confirm('Delete this contact?')) return;
      aftIdbDeleteContact(id).then(function() {
        detail.style.display = 'none';
        if (list) list.style.display = 'block';
        loadAftContacts();
        toast('Deleted');
      }).catch(function(e) { toast('Error: ' + e.message); });
    });
  });
}

function showAftContactForm(mode, contact) {
  var form = document.getElementById('contact-form');
  var list = document.getElementById('contact-list');
  var detail = document.getElementById('contact-detail');
  if (list) list.style.display = 'none';
  if (detail) detail.style.display = 'none';
  if (!form) return;
  form.style.display = 'block';
  var titleEl = document.getElementById('contact-form-title');
  if (titleEl) titleEl.textContent = mode === 'edit' ? 'Edit Contact' : 'New Contact';
  document.getElementById('cf-name').value = contact ? contact.name : '';
  document.getElementById('cf-phone').value = contact ? contact.phone || '' : '';
  document.getElementById('cf-email').value = contact ? contact.email || '' : '';
  document.getElementById('cf-type').value = contact ? contact.relationship_type || '' : '';
  document.getElementById('cf-how-met').value = contact ? contact.how_met || '' : '';
  document.getElementById('cf-trust').value = contact ? contact.trust_level || 0 : 0;
  document.getElementById('cf-potential').value = contact ? contact.business_potential || '' : '';
  document.getElementById('cf-tags').value = contact ? (Array.isArray(contact.tags) ? contact.tags.join(', ') : '') : '';
  document.getElementById('cf-notes').value = contact ? contact.notes || '' : '';
  document.getElementById('cf-id').value = contact ? contact.id || '' : '';
  aftUpdateTrustDots(contact ? contact.trust_level || 0 : 0);
}

function saveAftContact() {
  var id = document.getElementById('cf-id').value;
  var name = document.getElementById('cf-name').value.trim();
  if (!name) { toast('Name is required'); return; }
  var tagsRaw = document.getElementById('cf-tags').value;
  var tags = tagsRaw ? tagsRaw.split(',').map(function(t) { return t.trim(); }).filter(Boolean) : [];
  var contact = {
    name: name,
    phone: document.getElementById('cf-phone').value.trim(),
    email: document.getElementById('cf-email').value.trim(),
    relationship_type: document.getElementById('cf-type').value,
    how_met: document.getElementById('cf-how-met').value.trim(),
    trust_level: parseInt(document.getElementById('cf-trust').value, 10) || 0,
    business_potential: document.getElementById('cf-potential').value,
    tags: tags,
    notes: document.getElementById('cf-notes').value.trim()
  };
  if (id) contact.id = id;
  aftIdbSaveContact(contact).then(function() {
    document.getElementById('contact-form').style.display = 'none';
    document.getElementById('contact-list').style.display = 'block';
    loadAftContacts();
    toast(id ? 'Updated' : 'Contact saved');
  }).catch(function(e) { toast('Save failed: ' + e.message); });
}

function initAftContactsTab() {
  if (aftContactsInitialized) { loadAftContacts(); return; }
  aftContactsInitialized = true;
  var newBtn = document.getElementById('contact-new-btn');
  if (newBtn) newBtn.addEventListener('click', function() { showAftContactForm('new', null); });
  var saveBtn = document.getElementById('contact-form-save');
  var cancelBtn = document.getElementById('contact-form-cancel');
  if (saveBtn) saveBtn.addEventListener('click', saveAftContact);
  if (cancelBtn) cancelBtn.addEventListener('click', function() {
    document.getElementById('contact-form').style.display = 'none';
    document.getElementById('contact-list').style.display = 'block';
  });
  document.querySelectorAll('#cf-trust-dots .trust-dot').forEach(function(dot) {
    dot.addEventListener('click', function() { aftUpdateTrustDots(parseInt(dot.dataset.val, 10)); });
  });
  var searchInput = document.getElementById('contact-search');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      aftContactSearch = searchInput.value;
      loadAftContacts();
    });
  }
  var filterChips = document.getElementById('contact-filter-chips');
  if (filterChips) {
    filterChips.querySelectorAll('.filter-chip').forEach(function(chip) {
      chip.addEventListener('click', function() {
        filterChips.querySelectorAll('.filter-chip').forEach(function(c) { c.classList.remove('active'); });
        chip.classList.add('active');
        aftContactFilter = chip.dataset.filter || '';
        renderAftContactList();
      });
    });
  }
  loadAftContacts();
}
