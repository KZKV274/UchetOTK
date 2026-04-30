(function() {
  // ========== SERVICE WORKER ==========
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});

  // ========== THEME ==========
  const themeKey = 'otk_theme';
  function getTheme() { return localStorage.getItem(themeKey) || 'light'; }
  function setTheme(t) { localStorage.setItem(themeKey, t); document.body.classList.toggle('dark', t==='dark'); const tg = document.getElementById('themeToggle'); if(tg) tg.textContent = t==='dark'?'☀️':'🌓'; }
  setTheme(getTheme());

  // ========== STORAGE ==========
  function load(key, fallback=[]) { try { const r=localStorage.getItem(key); return r?JSON.parse(r):fallback; } catch { return fallback; } }
  function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

  // ========== STATE ==========
  const DEFECTS = [
    'Кривая строчка', 'Торчат нитки', 'Разная длина рукавов',
    'Плохо пришита пуговица', 'Пятно на ткани', 'Воротник неровный',
    'Подкладка морщит', 'Карманы на разном уровне'
  ];
  
  let checks = load('otk_checks', []);
  let seamstresses = load('otk_seamstresses', ['Айнура', 'Гульнара', 'Жибек', 'Каныкей']);
  let sizes = ['36','38','40','42','44','46','48','50','52','54'];
  let currentTab = 'check';

  function persist() { save('otk_checks', checks); save('otk_seamstresses', seamstresses); }

  // ========== HELPERS ==========
  function formatDate(iso) { return new Date(iso).toLocaleDateString('ru-RU'); }
  function getToday() { return new Date().toISOString().slice(0,10); }
  function getWeekStart() { const d=new Date(); d.setDate(d.getDate()-d.getDay()+1); return d.toISOString().slice(0,10); }

  // ========== RENDER ==========
  const appContent = document.getElementById('app-content');

  function render() {
    let html = '';
    html += `<nav>
      <button class="${currentTab==='check'?'active':''}" data-tab="check">🔍 Проверка</button>
      <button class="${currentTab==='stats'?'active':''}" data-tab="stats">📊 Статистика</button>
      <button class="${currentTab==='history'?'active':''}" data-tab="history">📋 История</button>
    </nav>`;

    if (currentTab === 'check') html += renderCheck();
    else if (currentTab === 'stats') html += renderStats();
    else if (currentTab === 'history') html += renderHistory();

    appContent.innerHTML = html;
    bindEvents();
  }

  function renderCheck() {
    const todayChecks = checks.filter(c => c.createdAt.startsWith(getToday())).length;
    let h = `<h2>🔍 Проверка пиджака <span class="counter-badge">Сегодня: ${todayChecks}</span></h2>`;

    h += `<div class="form-group"><label>👤 Швея</label><select id="seamstress">${seamstresses.map(s=>`<option>${s}</option>`).join('')}</select><input placeholder="Добавить швею" id="newSeamstress" style="margin-top:6px;"></div>`;
    h += `<div class="form-group"><label>📏 Размер</label><select id="sizeSelect">${sizes.map(s=>`<option>${s}</option>`).join('')}</select></div>`;
    h += `<div class="form-group"><label>📝 Примечание</label><input id="noteInput" placeholder="Номер изделия или комментарий"></div>`;

    h += `<h3>Чек-лист дефектов</h3><div class="checklist">`;
    DEFECTS.forEach((d, i) => {
      h += `<div class="checklist-item">
        <span class="defect-name">${d}</span>
        <div class="check-status">
          <button class="status-btn pass" data-idx="${i}" data-status="pass">✅</button>
          <button class="status-btn fail" data-idx="${i}" data-status="fail">❌</button>
        </div>
      </div>`;
    });
    h += `</div>`;

    h += `<div class="actions">
      <button class="btn btn-success" id="acceptBtn">✅ Принято (без дефектов)</button>
      <button class="btn btn-danger" id="rejectBtn" style="display:none;">❌ Брак — на переделку</button>
    </div>`;

    return h;
  }

  function bindEvents() {
    document.getElementById('themeToggle').onclick = () => { setTheme(getTheme()==='light'?'dark':'light'); };
    document.querySelectorAll('[data-tab]').forEach(b => b.onclick = (e) => { currentTab = e.target.dataset.tab; render(); });

    if (currentTab === 'check') bindCheckEvents();
  }

  function bindCheckEvents() {
    const defectStatuses = {};

    document.querySelectorAll('.status-btn').forEach(btn => {
      btn.onclick = function() {
        const idx = parseInt(this.dataset.idx);
        const status = this.dataset.status;
        const siblings = this.parentElement.querySelectorAll('.status-btn');
        
        if (this.classList.contains('active')) {
          // Снять выбор
          this.classList.remove('active');
          delete defectStatuses[idx];
        } else {
          // Выбрать, снять другой
          siblings.forEach(s => s.classList.remove('active'));
          this.classList.add('active');
          defectStatuses[idx] = status;
        }
        updateButtons(defectStatuses);
      };
    });

    function updateButtons(statuses) {
      const fails = Object.values(statuses).filter(s => s === 'fail');
      const acceptBtn = document.getElementById('acceptBtn');
      const rejectBtn = document.getElementById('rejectBtn');
      
      if (fails.length > 0) {
        acceptBtn.style.display = 'none';
        rejectBtn.style.display = 'block';
        rejectBtn.textContent = `❌ Брак — ${fails.length} дефект(ов) — на переделку`;
      } else if (Object.keys(statuses).length === DEFECTS.length) {
        // Все проверены и все pass
        acceptBtn.style.display = 'block';
        rejectBtn.style.display = 'none';
        acceptBtn.textContent = '✅ Принято — всё отлично!';
      } else {
        acceptBtn.style.display = 'block';
        rejectBtn.style.display = 'none';
        acceptBtn.textContent = '✅ Принято (проверено не всё)';
      }
    }

    document.getElementById('acceptBtn').onclick = () => {
      const seamstress = document.getElementById('seamstress').value;
      const size = document.getElementById('sizeSelect').value;
      const note = document.getElementById('noteInput').value.trim();
      const defectsFound = Object.entries(defectStatuses).filter(([,s]) => s === 'fail').map(([i]) => DEFECTS[i]);
      
      checks.push({
        id: Date.now().toString(36),
        createdAt: new Date().toISOString(),
        seamstress, size, note,
        result: defectsFound.length === 0 ? 'accepted' : 'rejected',
        defects: defectsFound,
        allChecked: Object.keys(defectStatuses).length
      });
      persist();
      if (navigator.vibrate) navigator.vibrate(defectsFound.length ? [50,100,50] : [30,30,30]);
      render();
    };

    document.getElementById('rejectBtn').onclick = () => {
      document.getElementById('acceptBtn').click(); // Та же логика сохранения
    };
  }

  function renderStats() {
    const today = getToday();
    const weekStart = getWeekStart();
    const todayChecks = checks.filter(c => c.createdAt.startsWith(today));
    const weekChecks = checks.filter(c => c.createdAt >= weekStart);
    const todayTotal = todayChecks.length;
    const todayRejected = todayChecks.filter(c => c.result === 'rejected').length;
    const todayAccepted = todayChecks.filter(c => c.result === 'accepted').length;
    const rejectionRate = todayTotal > 0 ? Math.round((todayRejected / todayTotal) * 100) : 0;

    // Частые дефекты
    const defectCounts = {};
    checks.filter(c => c.result === 'rejected').forEach(c => {
      c.defects.forEach(d => { defectCounts[d] = (defectCounts[d] || 0) + 1; });
    });
    const topDefects = Object.entries(defectCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const maxDefect = topDefects[0] ? topDefects[0][1] : 1;

    // По швеям
    const seamstressStats = {};
    checks.forEach(c => {
      if (!seamstressStats[c.seamstress]) seamstressStats[c.seamstress] = { total: 0, rejected: 0 };
      seamstressStats[c.seamstress].total++;
      if (c.result === 'rejected') seamstressStats[c.seamstress].rejected++;
    });
    const worstSeamstresses = Object.entries(seamstressStats)
      .map(([name, s]) => ({ name, rate: s.total > 0 ? Math.round((s.rejected/s.total)*100) : 0, total: s.total }))
      .sort((a,b) => b.rate - a.rate).slice(0, 5);

    let h = `<h2>📊 Статистика</h2>`;
    h += `<div class="stats-grid">
      <div class="card"><strong>🔍 Сегодня проверено</strong><span class="big-number">${todayTotal}</span></div>
      <div class="card"><strong>✅ Принято</strong><span style="color:#4caf50;">${todayAccepted}</span></div>
      <div class="card"><strong>❌ Брак</strong><span style="color:#f44336;">${todayRejected}</span></div>
      <div class="card"><strong>📊 % брака</strong><span>${rejectionRate}%</span></div>
      <div class="card"><strong>📅 За неделю</strong><span>${weekChecks.length}</span></div>
    </div>`;

    h += `<h3>🔥 Частые дефекты</h3><ul class="top-list">`;
    topDefects.forEach(([defect, count]) => {
      const pct = Math.round((count/maxDefect)*100);
      h += `<li><span>${defect}</span><div class="bar-wrap"><div class="bar-fill" style="width:${pct}%"></div></div><span>${count}</span></li>`;
    });
    h += topDefects.length === 0 ? '<li>Нет данных</li>' : '';
    h += `</ul>`;

    h += `<h3>👤 По швеям (% брака)</h3><ul class="top-list">`;
    worstSeamstresses.forEach(s => {
      h += `<li><span>${s.name}</span><div class="bar-wrap"><div class="bar-fill" style="width:${s.rate}%;background:${s.rate>30?'#f44336':'#ff9800'}"></div></div><span>${s.rate}% (${s.total}检)</span></li>`;
    });
    h += worstSeamstresses.length === 0 ? '<li>Нет данных</li>' : '';
    h += `</ul>`;

    return h;
  }

  function renderHistory() {
    const recent = [...checks].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);
    let h = `<h2>📋 История проверок</h2>`;
    if (recent.length === 0) { h += `<p style="color:#8b6a50;text-align:center;padding:30px;">Нет проверок</p>`; return h; }

    const groups = {};
    recent.forEach(c => {
      const day = c.createdAt.slice(0,10);
      if (!groups[day]) groups[day] = [];
      groups[day].push(c);
    });

    Object.entries(groups).forEach(([day, dayChecks]) => {
      const dayTotal = dayChecks.length;
      const dayRejected = dayChecks.filter(c => c.result === 'rejected').length;
      h += `<h3>📅 ${formatDate(day+'T00:00:00')} — ${dayTotal} проверок, ${dayRejected} брак</h3>`;
      dayChecks.forEach(c => {
        h += `<div class="history-item">
          <span class="history-badge ${c.result==='accepted'?'pass':'fail'}">${c.result==='accepted'?'✅ Принято':'❌ Брак'}</span>
          <span style="margin-left:8px;">👤 ${c.seamstress}</span>
          <span style="margin-left:8px;">📏 Размер ${c.size}</span>
          ${c.note ? `<span style="margin-left:8px;">📝 ${c.note}</span>` : ''}
          ${c.defects.length > 0 ? `<div style="margin-top:6px;">${c.defects.map(d => `<span class="defect-tag">${d}</span>`).join(' ')}</div>` : ''}
          <div style="font-size:11px;color:#8b6a50;margin-top:4px;">${new Date(c.createdAt).toLocaleTimeString('ru-RU')}</div>
        </div>`;
      });
    });
    return h;
  }

  render();
})();
