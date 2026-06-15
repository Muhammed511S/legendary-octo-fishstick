const keys = {
    students: 'school_students',
    teachers: 'school_teachers',
    grades: 'school_grades',
};

const gradeFields = ['w1', 'o1', 'q1', 'e1', 'w2', 'o2', 'q2', 'e2'];

function load(type) {
    try {
        return JSON.parse(localStorage.getItem(keys[type])) || [];
    } catch {
        return [];
    }
}

function save(type, data) {
    localStorage.setItem(keys[type], JSON.stringify(data));
}

function nextId(items) {
    return Math.max(0, ...items.map((item) => item.id || 0)) + 1;
}

function toNumber(value) {
    const english = String(value)
        .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
        .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    return Number(english) || 0;
}

function actionButton(text, onClick, danger = false) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.style.cssText = `margin:2px;padding:6px 10px;border:0;border-radius:6px;color:white;background:${danger ? '#c2410c' : '#1769aa'};cursor:pointer`;
    btn.onclick = onClick;
    return btn;
}

function addActionsColumn(table) {
    const row = table.querySelector('thead tr');
    if (!row || row.querySelector('.actions-title')) return;

    const th = document.createElement('th');
    th.className = 'actions-title';
    th.textContent = 'إجراءات';
    row.appendChild(th);
}

function initHome() {
    const stats = document.querySelectorAll('.stat-card strong');
    if (stats.length < 3) return;

    stats[0].textContent = load('students').length;
    stats[1].textContent = load('teachers').length;
    stats[2].textContent = new Set(load('students').map((s) => s.classLevel)).size;
}

function initPeoplePage(type, config) {
    const name = document.getElementById(config.nameId);
    const select = document.getElementById(config.selectId);
    const date = document.getElementById(config.dateId);
    const table = document.querySelector('.table-panel table');
    if (!name || !select || !date || !table) return;

    const form = name.closest('form');
    const submit = form.querySelector('button');
    const body = table.querySelector('tbody');
    let editId = null;

    submit.textContent = config.saveText;
    addActionsColumn(table);

    function resetForm() {
        editId = null;
        form.reset();
        submit.textContent = config.saveText;
    }

    function render() {
        const items = load(type);
        body.innerHTML = items.length ? '' : `<tr><td colspan="4">${config.emptyText}</td></tr>`;

        items.forEach((item) => {
            const tr = document.createElement('tr');
            tr.innerHTML = config.row(item) + '<td></td>';

            tr.lastElementChild.append(
                actionButton('تعديل', () => {
                    editId = item.id;
                    name.value = item.name;
                    select.value = item[config.selectField];
                    date.value = item[config.dateField] || '';
                    submit.textContent = config.updateText;
                }),
                actionButton('حذف', () => {
                    save(type, load(type).filter((row) => row.id !== item.id));
                    if (type === 'students') {
                        save('grades', load('grades').filter((g) => g.studentId !== item.id));
                    }
                    resetForm();
                    render();
                }, true)
            );

            body.appendChild(tr);
        });
    }

    submit.onclick = () => {
        const item = {
            name: name.value.trim(),
            [config.selectField]: select.value,
            [config.dateField]: date.value,
        };

        if (!item.name) return alert(config.alertText);

        const items = load(type);
        save(type, editId
            ? items.map((row) => row.id === editId ? { id: editId, ...item } : row)
            : [...items, { id: nextId(items), ...item }]
        );

        resetForm();
        render();
    };

    render();
}

function initStudents() {
    initPeoplePage('students', {
        nameId: 'student-name',
        selectId: 'student-class',
        dateId: 'student-birth',
        selectField: 'classLevel',
        dateField: 'birthDate',
        saveText: 'حفظ الطالب',
        updateText: 'تحديث الطالب',
        emptyText: 'لا توجد بيانات طلاب محفوظة.',
        alertText: 'يرجى إدخال اسم الطالب.',
        row: (s) => `<td>${s.name}</td><td>${s.classLevel}</td><td>${s.birthDate || ''}</td>`,
    });
}

function initTeachers() {
    initPeoplePage('teachers', {
        nameId: 'teacher-name',
        selectId: 'teacher-subject',
        dateId: 'teacher-date',
        selectField: 'subject',
        dateField: 'hireDate',
        saveText: 'حفظ المعلم',
        updateText: 'تحديث المعلم',
        emptyText: 'لا توجد بيانات معلمين محفوظة.',
        alertText: 'يرجى إدخال اسم المعلم.',
        row: (t) => `<td>${t.name}</td><td>${t.subject}</td><td>${t.hireDate || ''}</td>`,
    });
}

function emptyGrade(studentId, subject) {
    const grade = { studentId, subject };
    gradeFields.forEach((field) => grade[field] = 0);
    return grade;
}

function calc(g) {
    const a1 = g.w1 + g.o1 + g.q1;
    const r1 = a1 + g.e1;
    const a2 = g.w2 + g.o2 + g.q2;
    const r2 = a2 + g.e2;
    return [a1, r1, a2, r2, (r1 + r2) / 2].map((n) => Number.isInteger(n) ? n : n.toFixed(1));
}

function initGrades() {
    const table = document.querySelector('.grades-table');
    const saveBtn = document.getElementById('save-grades');
    const filters = document.querySelectorAll('.filters-bar select');
    if (!table || !saveBtn || filters.length < 2) return;

    const body = table.querySelector('tbody');
    const [classSelect, subjectSelect] = filters;

    function gradeFor(studentId, subject) {
        return load('grades').find((g) => g.studentId === studentId && g.subject === subject)
            || emptyGrade(studentId, subject);
    }

    function updateResults(row) {
        const grade = readRow(row);
        row.querySelectorAll('.result-cell').forEach((cell, i) => cell.textContent = calc(grade)[i]);
    }

    function readRow(row) {
        const grade = {
            studentId: Number(row.dataset.studentId),
            subject: subjectSelect.value,
        };

        row.querySelectorAll('input').forEach((input) => {
            grade[input.dataset.field] = toNumber(input.value);
        });

        return grade;
    }

    function render() {
        const students = load('students').filter((s) => s.classLevel === classSelect.value);
        body.innerHTML = students.length ? '' : '<tr><td colspan="14">لا يوجد طلاب محفوظون في هذا الصف.</td></tr>';

        students.forEach((student) => {
            const grade = gradeFor(student.id, subjectSelect.value);
            const tr = document.createElement('tr');
            tr.dataset.studentId = student.id;
            tr.innerHTML = `<td>${student.name}</td>` + gradeFields.map((field, i) => {
                const result = [2, 3, 6, 7].includes(i) ? '<td class="result-cell">0</td>' : '';
                return `<td><input class="grade-input" data-field="${field}" type="text" inputmode="decimal" lang="en" dir="ltr" value="${grade[field]}"></td>${result}`;
            }).join('') + '<td class="result-cell">0</td>';

            tr.querySelectorAll('input').forEach((input) => input.oninput = () => updateResults(tr));
            body.appendChild(tr);
            updateResults(tr);
        });
    }

    saveBtn.onclick = () => {
        const currentRows = [...body.querySelectorAll('tr[data-student-id]')].map(readRow);
        const currentIds = currentRows.map((g) => g.studentId);
        const otherGrades = load('grades').filter((g) => (
            g.subject !== subjectSelect.value || !currentIds.includes(g.studentId)
        ));
        save('grades', [...otherGrades, ...currentRows]);
        alert('تم حفظ العلامات.');
    };

    classSelect.onchange = render;
    subjectSelect.onchange = render;
    render();
}

initHome();
initStudents();
initTeachers();
initGrades();
