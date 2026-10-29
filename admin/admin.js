// ============================================================
// Perfinted Admin CMS — admin.js
// ============================================================

function getApi() {
    return window.PERFINTED_CONFIG ? window.PERFINTED_CONFIG.getApiUrl() : (localStorage.getItem('PERFINTED_API_URL') || '');
}

function getHeaders(custom = {}) {
    return window.PERFINTED_CONFIG ? window.PERFINTED_CONFIG.getAuthHeaders(custom) : custom;
}

let allStudents = [];
let allResults = [];
let allClasses = [];

// ============================================================
// INIT — Auth check and boot
// ============================================================
async function init() {
    try {
        const res = await fetch(`${getApi()}/api/auth/me`, {
            credentials: 'include',
            headers: getHeaders()
        });
        if (!res.ok) {
            window.location.href = '/admin/login.html';
            return;
        }
        const me = await res.json();
        document.getElementById('adminUsername').textContent = me.username;
        loadOverview();
        loadStudents();
        loadResults();
        loadClasses();
        loadSubjects();
        loadServerSettings();
    } catch (e) {
        console.warn('Could not connect to backend server:', e);
    }
}

// ============================================================
// TAB SWITCHING
// ============================================================
const tabTitles = {
    overview: ['Overview', 'Welcome to the Perfinted admin panel.'],
    students: ['Students', 'Manage all enrolled students.'],
    results: ['Results', 'View and manage all student results.'],
    classes: ['Classes & Subjects', 'Manage classes and available subjects.'],
    serversettings: ['Server & Domain', 'Connect and configure backend server or domain name.'],
    changepassword: ['Change Password', 'Update your admin account password.'],
};

function switchTab(tabName) {
    if (tabName === 'logout') { doLogout(); return; }

    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const tabEl = document.getElementById(`tab-${tabName}`);
    if (tabEl) tabEl.style.display = 'block';
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    const [title, subtitle] = tabTitles[tabName] || ['Admin', ''];
    document.getElementById('pageTitle').textContent = title;
    document.getElementById('pageSubtitle').textContent = subtitle;

    if (tabName === 'serversettings') loadServerSettings();
}

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
});

// ============================================================
// LOGOUT
// ============================================================
async function doLogout() {
    try {
        await fetch(`${getApi()}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: getHeaders()
        });
    } catch (e) {}
    localStorage.removeItem('perfinted_token');
    window.location.href = '/admin/login.html';
}

// ============================================================
// OVERVIEW — Stats
// ============================================================
async function loadOverview() {
    const res = await fetch(`${getApi()}/api/results/stats`, {
        credentials: 'include',
        headers: getHeaders()
    });
    if (!res.ok) return;
    const s = await res.json();
    document.getElementById('statStudents').textContent = s.totalStudents;
    document.getElementById('statResults').textContent = s.totalResults;
    document.getElementById('statPassRate').textContent = s.passRate + '%';
    document.getElementById('statTopStudent').textContent = s.topStudent
        ? `${s.topStudent.name} (${parseFloat(s.topStudent.avg_marks).toFixed(1)}%)`
        : 'N/A';
}

// ============================================================
// STUDENTS
// ============================================================
async function loadStudents() {
    const res = await fetch(`${getApi()}/api/students`, {
        credentials: 'include',
        headers: getHeaders()
    });
    if (!res.ok) return;
    allStudents = await res.json();
    renderStudents(allStudents);
}

function renderStudents(students) {
    const tbody = document.getElementById('studentsBody');
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">No students found.</td></tr>';
        return;
    }
    tbody.innerHTML = students.map(s => `
        <tr>
            <td style="color:var(--text-muted);">${s.student_id}</td>
            <td style="font-weight:500;">${s.name}</td>
            <td>${s.class_name ? `${s.class_name} — ${s.section}` : '<span style="color:var(--text-muted);">—</span>'}</td>
            <td style="color:var(--text-muted); font-size:0.85rem;">${formatDate(s.created_at)}</td>
            <td>
                <div style="display:flex; gap:0.5rem;">
                    <button class="action-btn edit-btn" onclick="openStudentModal(${JSON.stringify(s).replace(/"/g, '&quot;')})">Edit</button>
                    <button class="action-btn delete-btn" onclick="confirmDelete('student', ${s.id}, '${s.name}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterStudents() {
    const q = document.getElementById('studentSearch').value.toLowerCase();
    const filtered = allStudents.filter(s =>
        s.name.toLowerCase().includes(q) || s.student_id.toLowerCase().includes(q)
    );
    renderStudents(filtered);
}

function openStudentModal(student = null) {
    document.getElementById('modalStudentId').value = student ? student.student_id : '';
    document.getElementById('modalStudentName').value = student ? student.name : '';
    document.getElementById('modalStudentDbId').value = student ? student.id : '';
    document.getElementById('studentModalTitle').textContent = student ? 'Edit Student' : 'Add Student';
    document.getElementById('studentModalError').style.display = 'none';

    // Populate class dropdown
    const sel = document.getElementById('modalStudentClass');
    sel.innerHTML = '<option value="">— No Class —</option>' +
        allClasses.map(c => `<option value="${c.id}" ${student && student.class_id === c.id ? 'selected' : ''}>${c.name} — ${c.section}</option>`).join('');

    document.getElementById('studentModal').style.display = 'flex';
}

async function saveStudent() {
    const dbId = document.getElementById('modalStudentDbId').value;
    const errDiv = document.getElementById('studentModalError');
    errDiv.style.display = 'none';

    const payload = {
        student_id: document.getElementById('modalStudentId').value.trim(),
        name: document.getElementById('modalStudentName').value.trim(),
        class_id: document.getElementById('modalStudentClass').value || null,
    };

    if (!payload.student_id || !payload.name) {
        errDiv.textContent = 'Student ID and name are required.';
        errDiv.style.display = 'block';
        return;
    }

    const url = dbId ? `${getApi()}/api/students/${dbId}` : `${getApi()}/api/students`;
    const method = dbId ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        closeModal('studentModal');
        loadStudents();
        loadOverview();
    } else {
        const data = await res.json().catch(() => ({}));
        errDiv.textContent = data.error || 'Failed to save student.';
        errDiv.style.display = 'block';
    }
}

// ============================================================
// RESULTS
// ============================================================
async function loadResults() {
    const res = await fetch(`${getApi()}/api/results`, {
        credentials: 'include',
        headers: getHeaders()
    });
    if (!res.ok) return;
    allResults = await res.json();
    renderResults(allResults);
}

function renderResults(results) {
    const tbody = document.getElementById('resultsBody');
    if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:2rem;">No results found.</td></tr>';
        return;
    }
    tbody.innerHTML = results.map(r => `
        <tr>
            <td style="color:var(--text-muted);">${r.studentId || r.student_id}</td>
            <td style="font-weight:500;">${r.name}</td>
            <td>${r.subject}</td>
            <td style="color:var(--primary); font-weight:600;">${r.marks !== undefined ? r.marks : r.total}</td>
            <td><span class="grade-badge grade-${r.grade}">${r.grade}</span></td>
            <td><span style="color:${r.status === 'Pass' ? '#4ade80' : '#f87171'}">${r.status}</span></td>
            <td style="color:var(--text-muted); font-size:0.85rem;">${formatDate(r.created_at)}</td>
            <td>
                <button class="action-btn delete-btn" onclick="confirmDelete('result', ${r.id}, '${r.name} — ${r.subject}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function filterResults() {
    const q = document.getElementById('resultSearch').value.toLowerCase();
    const statusFilter = document.getElementById('resultFilter').value;
    const filtered = allResults.filter(r => {
        const matchName = r.name.toLowerCase().includes(q) || (r.studentId || '').toLowerCase().includes(q);
        const matchStatus = !statusFilter || r.status === statusFilter;
        return matchName && matchStatus;
    });
    renderResults(filtered);
}

// ============================================================
// CLASSES & SUBJECTS
// ============================================================
async function loadClasses() {
    const res = await fetch(`${getApi()}/api/classes`, {
        credentials: 'include',
        headers: getHeaders()
    });
    if (!res.ok) return;
    allClasses = await res.json();
    renderClasses();
}

function renderClasses() {
    const container = document.getElementById('classesList');
    if (allClasses.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);">No classes added yet.</p>';
        return;
    }
    container.innerHTML = allClasses.map(c => `
        <div class="list-item">
            <span><strong>${c.name}</strong> — Section ${c.section}</span>
            <button class="action-btn delete-btn" onclick="confirmDelete('class', ${c.id}, '${c.name} ${c.section}')">Delete</button>
        </div>
    `).join('');
}

async function loadSubjects() {
    const res = await fetch(`${getApi()}/api/classes/subjects`, {
        credentials: 'include',
        headers: getHeaders()
    });
    if (!res.ok) return;
    const subjects = await res.json();
    const container = document.getElementById('subjectsList');
    if (subjects.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);">No subjects added yet.</p>';
        return;
    }
    container.innerHTML = subjects.map(s => `
        <div class="list-item">
            <span><strong>${s.name}</strong> <span style="color:var(--text-muted);">(Max: ${s.max_marks})</span></span>
            <button class="action-btn delete-btn" onclick="confirmDelete('subject', ${s.id}, '${s.name}')">Delete</button>
        </div>
    `).join('');
}

function openClassModal() {
    document.getElementById('modalClassName').value = '';
    document.getElementById('modalClassSection').value = 'A';
    document.getElementById('classModalError').style.display = 'none';
    document.getElementById('classModal').style.display = 'flex';
}

async function saveClass() {
    const errDiv = document.getElementById('classModalError');
    errDiv.style.display = 'none';
    const payload = {
        name: document.getElementById('modalClassName').value.trim(),
        section: document.getElementById('modalClassSection').value.trim() || 'A',
    };
    if (!payload.name) {
        errDiv.textContent = 'Class name is required.';
        errDiv.style.display = 'block';
        return;
    }
    const res = await fetch(`${getApi()}/api/classes`, {
        method: 'POST',
        credentials: 'include',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
    });
    if (res.ok) { closeModal('classModal'); loadClasses(); }
    else {
        const data = await res.json().catch(() => ({}));
        errDiv.textContent = data.error || 'Failed to save class.';
        errDiv.style.display = 'block';
    }
}

function openSubjectModal() {
    document.getElementById('modalSubjectName').value = '';
    document.getElementById('modalSubjectMax').value = '100';
    document.getElementById('subjectModalError').style.display = 'none';
    document.getElementById('subjectModal').style.display = 'flex';
}

async function saveSubject() {
    const errDiv = document.getElementById('subjectModalError');
    errDiv.style.display = 'none';
    const payload = {
        name: document.getElementById('modalSubjectName').value.trim(),
        max_marks: parseInt(document.getElementById('modalSubjectMax').value) || 100,
    };
    if (!payload.name) {
        errDiv.textContent = 'Subject name is required.';
        errDiv.style.display = 'block';
        return;
    }
    const res = await fetch(`${getApi()}/api/classes/subjects`, {
        method: 'POST',
        credentials: 'include',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
    });
    if (res.ok) { closeModal('subjectModal'); loadSubjects(); }
    else {
        const data = await res.json().catch(() => ({}));
        errDiv.textContent = data.error || 'Failed to save subject.';
        errDiv.style.display = 'block';
    }
}

// ============================================================
// DELETE (universal)
// ============================================================
function confirmDelete(type, id, label) {
    document.getElementById('deleteMessage').textContent = `Delete "${label}"? This action cannot be undone.`;
    const btn = document.getElementById('deleteConfirmBtn');
    btn.onclick = () => doDelete(type, id);
    document.getElementById('deleteModal').style.display = 'flex';
}

async function doDelete(type, id) {
    const endpoints = {
        student: `/api/students/${id}`,
        result: `/api/results/${id}`,
        class: `/api/classes/${id}`,
        subject: `/api/classes/subjects/${id}`,
    };
    await fetch(`${getApi()}${endpoints[type]}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getHeaders()
    });
    closeModal('deleteModal');
    if (type === 'student') { loadStudents(); loadOverview(); }
    if (type === 'result') { loadResults(); loadOverview(); }
    if (type === 'class') loadClasses();
    if (type === 'subject') loadSubjects();
}

// ============================================================
// MODALS
// ============================================================
function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// Close on backdrop click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.style.display = 'none';
    });
});

// ============================================================
// UTILS
// ============================================================
function formatDate(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ============================================================
// SERVER / DOMAIN SETTINGS
// ============================================================
function loadServerSettings() {
    const input = document.getElementById('adminServerUrlInput');
    if (input) {
        input.value = getApi();
    }
}

async function testAdminServerConnection() {
    const input = document.getElementById('adminServerUrlInput');
    const statusDiv = document.getElementById('adminServerStatus');
    const url = input.value.trim().replace(/\/+$/, '');
    statusDiv.style.display = 'block';
    statusDiv.style.color = '#e2e8f0';
    statusDiv.style.background = 'rgba(255,255,255,0.06)';
    statusDiv.textContent = 'Testing connection...';

    try {
        const target = url ? `${url}/api/health` : '/api/health';
        const res = await fetch(target);
        if (res.ok) {
            statusDiv.style.color = '#4ade80';
            statusDiv.style.background = 'rgba(74,222,128,0.12)';
            statusDiv.textContent = '✓ Server reachable and responsive!';
        } else {
            statusDiv.style.color = '#f87171';
            statusDiv.style.background = 'rgba(248,113,113,0.12)';
            statusDiv.textContent = `Server returned HTTP ${res.status}`;
        }
    } catch (e) {
        statusDiv.style.color = '#f87171';
        statusDiv.style.background = 'rgba(248,113,113,0.12)';
        statusDiv.textContent = '✗ Connection failed. Ensure server is running and domain is correct.';
    }
}

function saveAdminServerSettings() {
    const input = document.getElementById('adminServerUrlInput');
    const statusDiv = document.getElementById('adminServerStatus');
    const url = input.value.trim();
    if (window.PERFINTED_CONFIG) {
        window.PERFINTED_CONFIG.setApiUrl(url);
    } else {
        if (!url) localStorage.removeItem('PERFINTED_API_URL');
        else localStorage.setItem('PERFINTED_API_URL', url.replace(/\/+$/, ''));
    }
    statusDiv.style.display = 'block';
    statusDiv.style.color = '#4ade80';
    statusDiv.style.background = 'rgba(74,222,128,0.12)';
    statusDiv.textContent = url ? `✓ Connected to backend: ${url}` : '✓ Reset to same domain (relative path)';
    setTimeout(() => {
        init();
    }, 800);
}

// ============================================================
// CHANGE PASSWORD
// ============================================================
async function doChangePassword() {
    const currentPassword = document.getElementById('cpCurrentPassword').value;
    const newPassword = document.getElementById('cpNewPassword').value;
    const confirmPassword = document.getElementById('cpConfirmPassword').value;
    const errDiv = document.getElementById('cpError');
    const successDiv = document.getElementById('cpSuccess');
    const btn = document.getElementById('btnUpdatePassword');

    errDiv.style.display = 'none';
    successDiv.style.display = 'none';

    if (!currentPassword || !newPassword || !confirmPassword) {
        errDiv.textContent = 'All fields are required.';
        errDiv.style.display = 'block';
        return;
    }
    if (newPassword.length < 6) {
        errDiv.textContent = 'New password must be at least 6 characters.';
        errDiv.style.display = 'block';
        return;
    }
    if (newPassword !== confirmPassword) {
        errDiv.textContent = 'New passwords do not match.';
        errDiv.style.display = 'block';
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Updating...';
    }

    try {
        const res = await fetch(`${getApi()}/api/auth/change-password`, {
            method: 'POST',
            credentials: 'include',
            headers: getHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ currentPassword, newPassword })
        });

        if (res.ok) {
            successDiv.style.display = 'block';
            document.getElementById('cpCurrentPassword').value = '';
            document.getElementById('cpNewPassword').value = '';
            document.getElementById('cpConfirmPassword').value = '';
        } else {
            const data = await res.json().catch(() => ({}));
            errDiv.textContent = data.error || 'Failed to change password.';
            errDiv.style.display = 'block';
        }
    } catch (err) {
        errDiv.textContent = 'Network error occurred. Please try again.';
        errDiv.style.display = 'block';
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Update Password';
        }
    }
}

// ============================================================
// START
// ============================================================
init();
