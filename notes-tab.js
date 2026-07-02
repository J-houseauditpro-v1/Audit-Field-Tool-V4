// Notes tab — local IndexedDB only, no server
var aftNotesData = [];
var aftNotesSearch = '';
var aftNotesTasksOnly = false;
var aftNotesInitialized = false;

function aftNotesEsc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function loadAftNotes() {
  var list = document.getElementById('notes-list');
  if (!list) return;
  aftIdbGetNotes().then(function(notes) {
    aftNotesData = notes || [];
    if (aftNotesSearch) {
      var q = aftNotesSearch.toLowerCase();
      aftNotesData = aftNotesData.filter(function(n) {
        return (n.title || '').toLowerCase().indexOf(q) !== -1 ||
               (n.content || '').toLowerCase().indexOf(q) !== -1 ||
               (n.tags || []).some(function(t) { return t.toLowerCase().indexOf(q) !== -1; });
      });
    }
    if (aftNotesTasksOnly) {
      aftNotesData = aftNotesData.filter(function(n) { return !!n.is_task; });
    }
    aftNotesData.sort(function(a, b) {
      return (b.updated_at || b.created_at || '') > (a.updated_at || a.created_at || '') ? 1 : -1;
    });
    renderAftNotesList();
  }).catch(function(e) {
    list.innerHTML = '<div class="empty-msg">⚠️ ' + (e.message || 'Error loading notes') + '</div>';
  });
}

function renderAftNotesList() {
  var list = document.getElementById('notes-list');
  var editor = document.getElementById('note-editor');
  if (!list) return;
  if (editor && editor.style.display !== 'none') return;
  if (!aftNotesData.length) {
    list.innerHTML = '<div class="empty-msg">' + (aftNotesSearch || aftNotesTasksOnly ? 'No matches' : 'No notes yet — tap + New') + '</div>';
    return;
  }
  list.innerHTML = '';
  aftNotesData.forEach(function(note) {
    var card = document.createElement('div');
    card.className = 'note-card' + (note.is_task ? ' is-task' + (note.task_complete ? ' complete' : '') : '');
    var tags = (note.tags || []).slice(0, 3).map(function(t) {
      return '<span class="note-tag">' + aftNotesEsc(t) + '</span>';
    }).join('');
    var taskBadge = note.is_task ? '<span class="note-task-badge">' + (note.task_complete ? '✓' : '○') + ' Task</span>' : '';
    var preview = (note.content || '').slice(0, 120).replace(/[#*_`]/g, '');
    var date = new Date(note.updated_at || note.created_at).toLocaleDateString();
    card.innerHTML =
      '<div class="note-title">' + taskBadge + aftNotesEsc(note.title || (note.content || '').slice(0, 50) || 'Untitled') + '</div>' +
      (preview && preview !== note.title ? '<div class="note-preview">' + aftNotesEsc(preview) + '</div>' : '') +
      '<div class="note-date">' + date + (tags ? ' · ' : '') + tags + '</div>';
    card.addEventListener('click', function() { openAftNoteEditor(note.id); });
    list.appendChild(card);
  });
}

function openAftNoteEditor(id) {
  var editor = document.getElementById('note-editor');
  var list = document.getElementById('notes-list');
  if (!editor) return;
  var note = id ? aftNotesData.find(function(n) { return n.id === id; }) : null;
  document.getElementById('ne-title').value = note ? note.title || '' : '';
  document.getElementById('ne-content').value = note ? note.content || '' : '';
  document.getElementById('ne-tags').value = note ? (Array.isArray(note.tags) ? note.tags.join(', ') : '') : '';
  document.getElementById('ne-is-task').checked = note ? !!note.is_task : false;
  document.getElementById('ne-id').value = note ? note.id || '' : '';
  var deleteBtn = document.getElementById('note-editor-delete');
  if (deleteBtn) deleteBtn.style.display = id ? 'inline-block' : 'none';
  editor.style.display = 'block';
  if (list) list.style.display = 'none';
  document.getElementById('ne-title').focus();
}

function saveAftNote() {
  var id = document.getElementById('ne-id').value;
  var title = document.getElementById('ne-title').value.trim();
  var content = document.getElementById('ne-content').value.trim();
  var tagsRaw = document.getElementById('ne-tags').value;
  var isTask = document.getElementById('ne-is-task').checked;
  if (!title && !content) { toast('Add a title or some content'); return; }
  var tags = tagsRaw ? tagsRaw.split(',').map(function(t) { return t.trim(); }).filter(Boolean) : [];
  var existing = id ? aftNotesData.find(function(n) { return n.id === id; }) : null;
  var note = {
    title: title || content.slice(0, 60),
    content: content,
    tags: tags,
    is_task: isTask,
    task_complete: existing ? !!existing.task_complete : false
  };
  if (id) note.id = id;
  aftIdbSaveNote(note).then(function() {
    closeAftNoteEditor();
    loadAftNotes();
    toast(id ? 'Note updated' : 'Note saved');
  }).catch(function(e) { toast('Save failed: ' + e.message); });
}

function deleteAftNote() {
  var id = document.getElementById('ne-id').value;
  if (!id) return;
  if (!confirm('Delete this note?')) return;
  aftIdbDeleteNote(id).then(function() {
    closeAftNoteEditor();
    loadAftNotes();
    toast('Note deleted');
  }).catch(function(e) { toast('Error: ' + e.message); });
}

function closeAftNoteEditor() {
  var editor = document.getElementById('note-editor');
  var list = document.getElementById('notes-list');
  if (editor) editor.style.display = 'none';
  if (list) list.style.display = 'block';
}

function initAftNotesTab() {
  if (aftNotesInitialized) { loadAftNotes(); return; }
  aftNotesInitialized = true;
  var newBtn = document.getElementById('note-new-btn');
  var saveBtn = document.getElementById('note-editor-save');
  var cancelBtn = document.getElementById('note-editor-cancel');
  var deleteBtn = document.getElementById('note-editor-delete');
  var tasksBtn = document.getElementById('note-tasks-btn');
  var searchInput = document.getElementById('notes-search');
  if (newBtn) newBtn.addEventListener('click', function() { openAftNoteEditor(null); });
  if (saveBtn) saveBtn.addEventListener('click', saveAftNote);
  if (cancelBtn) cancelBtn.addEventListener('click', closeAftNoteEditor);
  if (deleteBtn) deleteBtn.addEventListener('click', deleteAftNote);
  if (tasksBtn) {
    tasksBtn.addEventListener('click', function() {
      aftNotesTasksOnly = !aftNotesTasksOnly;
      tasksBtn.classList.toggle('active', aftNotesTasksOnly);
      loadAftNotes();
    });
  }
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      aftNotesSearch = searchInput.value;
      loadAftNotes();
    });
  }
  loadAftNotes();
}

function initAftMoreTab() {
  var morePills = document.querySelectorAll('.more-pill');
  morePills.forEach(function(pill) {
    pill.addEventListener('click', function() {
      morePills.forEach(function(p) { p.classList.remove('active'); });
      pill.classList.add('active');
      var target = pill.dataset.more;
      document.getElementById('more-contacts-panel').style.display = target === 'contacts' ? 'block' : 'none';
      document.getElementById('more-notes-panel').style.display = target === 'notes' ? 'block' : 'none';
      if (target === 'contacts') initAftContactsTab();
      if (target === 'notes') initAftNotesTab();
    });
  });
  initAftContactsTab();
}
