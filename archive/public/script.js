// Student Data Array
let students = [];
let searchQuery = '';

// DOM Elements
const form = document.getElementById('marksForm');
const resultsBody = document.getElementById('resultsBody');
const emptyState = document.getElementById('emptyState');

// --- Search Bar ---
const searchInput = document.querySelector('input[placeholder="Search student..."]');
if (searchInput) {
    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value.toLowerCase();
        renderTable();
    });
}

// --- Fetch Data on Load ---
async function fetchResults() {
    try {
        const response = await fetch('/api/results');
        if (!response.ok) throw new Error('Server error');
        const data = await response.json();

        // The API returns per-subject rows; group them per student by student_id
        const studentMap = {};
        data.forEach(row => {
            const key = row.studentId || row.student_id || row.id;
            if (!studentMap[key]) {
                studentMap[key] = {
                    id: row.studentId || row.student_id,
                    name: row.name,
                    math: 0, science: 0, english: 0,
                    total: 0, average: 0, grade: '—', status: '—'
                };
            }
            if (row.subject === 'Mathematics') studentMap[key].math = row.marks !== undefined ? row.marks : row.total;
            if (row.subject === 'Science') studentMap[key].science = row.marks !== undefined ? row.marks : row.total;
            if (row.subject === 'English') studentMap[key].english = row.marks !== undefined ? row.marks : row.total;
        });

        // Recalculate totals
        students = Object.values(studentMap).map(s => {
            const total = (s.math || 0) + (s.science || 0) + (s.english || 0);
            const average = (total / 3).toFixed(1);
            return { ...s, total, average, grade: calculateGrade(average), status: average >= 33 ? 'Pass' : 'Fail' };
        });

        renderTable();
    } catch (error) {
        console.warn('Server offline or error fetching results. Showing empty state.');
        emptyState.innerHTML = '⚠️ Could not connect to server. Make sure the backend is running.';
        emptyState.style.display = 'block';
    }
}

// Initial Fetch
fetchResults();

// --- Form Submission ---
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('studentName').value.trim();
    const id = document.getElementById('studentId').value.trim();
    const math = parseFloat(document.getElementById('mathMarks').value) || 0;
    const science = parseFloat(document.getElementById('scienceMarks').value) || 0;
    const english = parseFloat(document.getElementById('englishMarks').value) || 0;

    const total = math + science + english;
    const average = (total / 3).toFixed(1);
    const grade = calculateGrade(average);
    const status = average >= 33 ? 'Pass' : 'Fail';

    const student = { id, name, math, science, english, total, average, grade, status };

    try {
        const response = await fetch('/api/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(student)
        });

        if (response.ok) {
            fetchResults();
            form.reset();
        } else {
            const data = await response.json().catch(() => ({}));
            alert(data.error || 'Failed to save result. Please try again.');
        }
    } catch (error) {
        alert('Cannot reach the server. Ensure the backend is running with: node server.js');
    }
});

// --- Grade Helper ---
function calculateGrade(avg) {
    if (avg >= 90) return 'A';
    if (avg >= 80) return 'B';
    if (avg >= 70) return 'C';
    if (avg >= 60) return 'D';
    if (avg >= 33) return 'F';
    return 'G';
}

// --- Render Table ---
function renderTable() {
    resultsBody.innerHTML = '';

    const filtered = searchQuery
        ? students.filter(s =>
            s.name.toLowerCase().includes(searchQuery) ||
            String(s.id).toLowerCase().includes(searchQuery))
        : students;

    if (filtered.length > 0) {
        emptyState.style.display = 'none';
        filtered.forEach(student => {
            const row = document.createElement('tr');
            row.style.animation = 'fadeIn 0.5s ease-out';
            row.innerHTML = `
                <td style="color: var(--text-muted);">${student.id}</td>
                <td style="font-weight: 500;">${student.name}</td>
                <td>${student.math}</td>
                <td>${student.science}</td>
                <td>${student.english}</td>
                <td style="color: var(--primary); font-weight: 600;">${student.total}</td>
                <td>${student.average}%</td>
                <td><span class="grade-badge grade-${student.grade}">${student.grade}</span></td>
                <td>
                    <span style="color: ${student.status === 'Pass' ? '#4ade80' : '#f87171'}">
                        ${student.status}
                    </span>
                </td>
            `;
            resultsBody.appendChild(row);
        });
    } else {
        emptyState.style.display = 'block';
        emptyState.innerHTML = searchQuery
            ? `No results matching "<strong>${searchQuery}</strong>".`
            : 'No results added yet. Start by filling out the form above.';
    }
}

