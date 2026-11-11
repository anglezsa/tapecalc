(function () {
  'use strict';

  class SoundManager {
    constructor() {
      this.enabled = true;
      this.ctx = null;
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    click() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.025);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.025);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.03);
    }

    chime(isBonus) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      if (isBonus) {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
      } else {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(349.23, now + 0.12);
      }
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.23);
    }
  }

  const sound = new SoundManager();

  class Calculator {
    constructor() {
      this.reset();
    }

    reset() {
      this.display = '0';
      this.stored = null;
      this.op = null;
      this.history = '';
      this.shouldReset = false;
    }

    get numericValue() {
      return parseFloat(this.display.replace(/,/g, '')) || 0;
    }

    enterDigit(digit) {
      if (this.shouldReset || this.display === '0') {
        if (digit === '.') {
          this.display = '0.';
        } else {
          this.display = digit;
        }
        this.shouldReset = false;
      } else {
        if (digit === '.') {
          if (!this.display.includes('.')) {
            this.display += '.';
          }
        } else {
          if (this.display.length < 12) {
            this.display += digit;
          }
        }
      }
    }

    backspace() {
      if (this.shouldReset) return;
      if (this.display.length > 1) {
        this.display = this.display.slice(0, -1);
        if (this.display === '-' || this.display === '') this.display = '0';
      } else {
        this.display = '0';
      }
    }

    setOperation(op) {
      if (this.op && this.stored !== null && !this.shouldReset) {
        const res = this.compute(this.stored, this.numericValue, this.op);
        this.stored = res;
        this.display = this.formatNum(res);
      } else {
        this.stored = this.numericValue;
      }
      this.op = op;
      this.shouldReset = true;
      this.history = `${this.formatNum(this.stored)} ${op}`;
    }

    evaluate() {
      if (this.op && this.stored !== null) {
        const res = this.compute(this.stored, this.numericValue, this.op);
        this.history = `${this.formatNum(this.stored)} ${this.op} ${this.formatNum(this.numericValue)} =`;
        this.display = this.formatNum(res);
        this.stored = null;
        this.op = null;
        this.shouldReset = true;
        return res;
      }
      return this.numericValue;
    }

    percent() {
      const val = this.numericValue / 100;
      this.display = this.formatNum(val);
      this.shouldReset = true;
    }

    toggleSign() {
      const val = -this.numericValue;
      this.display = this.formatNum(val);
    }

    clear() {
      if (this.display !== '0') {
        this.display = '0';
        this.shouldReset = false;
      } else {
        this.reset();
      }
    }

    compute(a, b, op) {
      switch (op) {
        case '+': return a + b;
        case '−': return a - b;
        case '×': return a * b;
        case '÷': return b === 0 ? 0 : a / b;
        default: return b;
      }
    }

    formatNum(n) {
      if (!isFinite(n) || isNaN(n)) return '0';
      const rounded = Math.round(n * 100000000) / 100000000;
      const str = rounded.toString();
      if (str.length > 12) {
        return rounded.toPrecision(8);
      }
      return str;
    }
  }

  const STORAGE_KEY = 'tapecalc_entries_v1';
  const calc = new Calculator();

  let entries = [];
  let currentFilter = 'all';
  let editingEntryId = null;

  const el = {
    screenDisplay: document.getElementById('screenDisplay'),
    screenHistory: document.getElementById('screenHistory'),
    noteInput: document.getElementById('noteInput'),
    clearNoteBtn: document.getElementById('clearNoteBtn'),
    quickTagsContainer: document.getElementById('quickTagsContainer'),
    netBalanceDisplay: document.getElementById('netBalanceDisplay'),
    totalBonusesDisplay: document.getElementById('totalBonusesDisplay'),
    totalChargesDisplay: document.getElementById('totalChargesDisplay'),
    countAll: document.getElementById('countAll'),
    countBonus: document.getElementById('countBonus'),
    countCharge: document.getElementById('countCharge'),
    tapeEntriesList: document.getElementById('tapeEntriesList'),
    tapeEmptyState: document.getElementById('tapeEmptyState'),
    tapeScrollBody: document.getElementById('tapeScrollBody'),
    commitBonusBtn: document.getElementById('commitBonusBtn'),
    commitChargeBtn: document.getElementById('commitChargeBtn'),
    clearTapeBtn: document.getElementById('clearTapeBtn'),
    exportBtn: document.getElementById('exportBtn'),
    soundToggle: document.getElementById('soundToggle'),
    appWrapper: document.getElementById('appWrapper'),

    editModal: document.getElementById('editModal'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    saveEditBtn: document.getElementById('saveEditBtn'),
    modalTypeBonus: document.getElementById('modalTypeBonus'),
    modalTypeCharge: document.getElementById('modalTypeCharge'),
    modalAmount: document.getElementById('modalAmount'),
    modalNote: document.getElementById('modalNote'),
    modalDate: document.getElementById('modalDate'),
    modalDeleteBtn: document.getElementById('modalDeleteBtn'),

    exportModal: document.getElementById('exportModal'),
    closeExportBtn: document.getElementById('closeExportBtn'),
    copyExportBtn: document.getElementById('copyExportBtn'),
    exportTextarea: document.getElementById('exportTextarea'),
    downloadTxtBtn: document.getElementById('downloadTxtBtn'),
    downloadCsvBtn: document.getElementById('downloadCsvBtn'),

    clearConfirmModal: document.getElementById('clearConfirmModal'),
    cancelClearBtn: document.getElementById('cancelClearBtn'),
    confirmClearBtn: document.getElementById('confirmClearBtn')
  };

  function loadEntries() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        entries = JSON.parse(data);
      }
    } catch (e) {
      entries = [];
    }

    if (entries.length === 0) {
      const now = Date.now();
      entries = [
        { id: uid(), timestamp: now - 7200000, amount: 2500.00, type: 'bonus', note: 'Monthly Salary' },
        { id: uid(), timestamp: now - 3600000, amount: 450.00, type: 'bonus', note: 'Project Completion Bonus' },
        { id: uid(), timestamp: now - 1800000, amount: 84.50, type: 'charge', note: 'Team Lunch' },
        { id: uid(), timestamp: now - 600000, amount: 15.20, type: 'charge', note: 'Coffee & Supplies' }
      ];
      saveEntries();
    }
  }

  function saveEntries() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {}
    renderTape();
    renderSummary();
  }

  function uid() {
    return 't_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  function updateCalcScreen() {
    el.screenDisplay.textContent = calc.display;
    el.screenHistory.innerHTML = calc.history || '&nbsp;';

    document.querySelectorAll('.key-op').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.op === calc.op && calc.shouldReset);
    });
  }

  function formatCurrency(amount) {
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDateTime(timestamp) {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
           d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  function renderSummary() {
    let totalBonuses = 0;
    let totalCharges = 0;
    let countBonus = 0;
    let countCharge = 0;

    for (const item of entries) {
      if (item.type === 'bonus') {
        totalBonuses += item.amount;
        countBonus++;
      } else {
        totalCharges += item.amount;
        countCharge++;
      }
    }

    const netBalance = totalBonuses - totalCharges;

    el.totalBonusesDisplay.textContent = '+' + formatCurrency(totalBonuses);
    el.totalChargesDisplay.textContent = '-' + formatCurrency(totalCharges);

    const signPrefix = netBalance > 0 ? '+' : (netBalance < 0 ? '-' : '');
    el.netBalanceDisplay.textContent = signPrefix + formatCurrency(Math.abs(netBalance));

    el.netBalanceDisplay.className = 'net-value';
    if (netBalance > 0) el.netBalanceDisplay.classList.add('positive');
    else if (netBalance < 0) el.netBalanceDisplay.classList.add('negative');

    el.countAll.textContent = entries.length;
    el.countBonus.textContent = countBonus;
    el.countCharge.textContent = countCharge;

    el.clearTapeBtn.disabled = entries.length === 0;
  }

  function renderTape() {
    const filtered = entries.filter(e => {
      if (currentFilter === 'bonus') return e.type === 'bonus';
      if (currentFilter === 'charge') return e.type === 'charge';
      return true;
    });

    if (filtered.length === 0) {
      el.tapeEntriesList.innerHTML = '';
      el.tapeEmptyState.style.display = 'flex';
      return;
    }

    el.tapeEmptyState.style.display = 'none';

    let runningSubtotal = 0;
    let html = '';

    filtered.forEach((entry, index) => {
      const signedVal = entry.type === 'bonus' ? entry.amount : -entry.amount;
      runningSubtotal += signedVal;

      const badgeLabel = entry.type === 'bonus' ? '+ BONUS' : '− CHARGE';
      const badgeClass = entry.type === 'bonus' ? 'bonus' : 'charge';
      const amountPrefix = entry.type === 'bonus' ? '+' : '−';
      const noteHtml = entry.note ? `<div class="item-note">${escapeHtml(entry.note)}</div>` : '';

      html += `
        <div class="tape-item" data-id="${entry.id}" role="button" tabindex="0" title="Tap to edit entry">
          <div class="tape-item-left">
            <div class="tape-item-header">
              <span class="item-index">#${String(index + 1).padStart(3, '0')}</span>
              <span class="item-badge ${badgeClass}">${badgeLabel}</span>
              <span class="item-time">${formatDateTime(entry.timestamp)}</span>
            </div>
            ${noteHtml}
          </div>
          <div class="tape-item-right">
            <span class="item-amount ${badgeClass}">${amountPrefix}${formatCurrency(entry.amount)}</span>
            <span class="item-subtotal">Bal: ${formatCurrency(runningSubtotal)}</span>
          </div>
        </div>
      `;
    });

    el.tapeEntriesList.innerHTML = html;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  function scrollToLatestEntry() {
    setTimeout(() => {
      el.tapeScrollBody.scrollTop = el.tapeScrollBody.scrollHeight;
    }, 50);
  }

  function commitCurrentAmount(type) {
    const amount = calc.evaluate();
    updateCalcScreen();

    if (amount <= 0) {
      sound.chime(false);
      el.screenDisplay.style.transform = 'scale(1.05)';
      setTimeout(() => el.screenDisplay.style.transform = '', 150);
      return;
    }

    sound.chime(type === 'bonus');

    const note = el.noteInput.value.trim();
    const newEntry = {
      id: uid(),
      timestamp: Date.now(),
      amount: Math.abs(amount),
      type: type,
      note: note
    };

    entries.push(newEntry);
    saveEntries();

    calc.reset();
    updateCalcScreen();
    el.noteInput.value = '';
    el.clearNoteBtn.style.display = 'none';
    document.querySelectorAll('.tag-pill').forEach(p => p.classList.remove('active'));

    scrollToLatestEntry();
  }

  document.querySelector('.keypad-grid').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    sound.click();

    if (btn.dataset.num !== undefined) {
      calc.enterDigit(btn.dataset.num);
    } else if (btn.dataset.op !== undefined) {
      calc.setOperation(btn.dataset.op);
    } else {
      const action = btn.dataset.action;
      if (action === 'clear') calc.clear();
      else if (action === 'backspace') calc.backspace();
      else if (action === 'percent') calc.percent();
      else if (action === 'toggle-sign') calc.toggleSign();
      else if (action === 'equals') calc.evaluate();
    }

    updateCalcScreen();
  });

  el.commitBonusBtn.addEventListener('click', () => commitCurrentAmount('bonus'));
  el.commitChargeBtn.addEventListener('click', () => commitCurrentAmount('charge'));

  el.noteInput.addEventListener('input', () => {
    el.clearNoteBtn.style.display = el.noteInput.value ? 'block' : 'none';
  });

  el.clearNoteBtn.addEventListener('click', () => {
    el.noteInput.value = '';
    el.clearNoteBtn.style.display = 'none';
    document.querySelectorAll('.tag-pill').forEach(p => p.classList.remove('active'));
  });

  el.quickTagsContainer.addEventListener('click', e => {
    const pill = e.target.closest('.tag-pill');
    if (!pill) return;
    sound.click();
    document.querySelectorAll('.tag-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    el.noteInput.value = pill.dataset.tag;
    el.clearNoteBtn.style.display = 'block';
  });

  document.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sound.click();
      document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTape();
    });
  });

  el.tapeEntriesList.addEventListener('click', e => {
    const itemEl = e.target.closest('.tape-item');
    if (!itemEl) return;
    const entryId = itemEl.dataset.id;
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    sound.click();
    openEditModal(entry);
  });

  let selectedEditType = 'bonus';

  function openEditModal(entry) {
    editingEntryId = entry.id;
    selectedEditType = entry.type;

    el.modalTypeBonus.classList.toggle('active', entry.type === 'bonus');
    el.modalTypeCharge.classList.toggle('active', entry.type === 'charge');
    el.modalAmount.value = entry.amount.toFixed(2);
    el.modalNote.value = entry.note || '';

    const d = new Date(entry.timestamp);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
    el.modalDate.value = localISOTime;

    el.editModal.classList.add('open');
    el.editModal.setAttribute('aria-hidden', 'false');
  }

  function closeEditModal() {
    el.editModal.classList.remove('open');
    el.editModal.setAttribute('aria-hidden', 'true');
    editingEntryId = null;
  }

  el.cancelEditBtn.addEventListener('click', closeEditModal);

  el.modalTypeBonus.addEventListener('click', () => {
    selectedEditType = 'bonus';
    el.modalTypeBonus.classList.add('active');
    el.modalTypeCharge.classList.remove('active');
  });

  el.modalTypeCharge.addEventListener('click', () => {
    selectedEditType = 'charge';
    el.modalTypeCharge.classList.add('active');
    el.modalTypeBonus.classList.remove('active');
  });

  el.saveEditBtn.addEventListener('click', () => {
    const entry = entries.find(e => e.id === editingEntryId);
    if (!entry) return closeEditModal();

    const amt = parseFloat(el.modalAmount.value);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }

    entry.amount = amt;
    entry.type = selectedEditType;
    entry.note = el.modalNote.value.trim();

    if (el.modalDate.value) {
      entry.timestamp = new Date(el.modalDate.value).getTime();
    }

    saveEntries();
    closeEditModal();
  });

  el.modalDeleteBtn.addEventListener('click', () => {
    if (editingEntryId) {
      entries = entries.filter(e => e.id !== editingEntryId);
      saveEntries();
      closeEditModal();
    }
  });

  el.clearTapeBtn.addEventListener('click', () => {
    if (entries.length === 0) return;
    el.clearConfirmModal.classList.add('open');
  });

  el.cancelClearBtn.addEventListener('click', () => {
    el.clearConfirmModal.classList.remove('open');
  });

  el.confirmClearBtn.addEventListener('click', () => {
    entries = [];
    saveEntries();
    el.clearConfirmModal.classList.remove('open');
  });

  el.exportBtn.addEventListener('click', () => {
    let receiptText = '==========================================\n';
    receiptText += '           RECEIPT TAPE LEDGER            \n';
    receiptText += '==========================================\n';

    let runningSubtotal = 0;
    entries.forEach((e, idx) => {
      runningSubtotal += (e.type === 'bonus' ? e.amount : -e.amount);
      const tag = e.type === 'bonus' ? '[+ BONUS] ' : '[- CHARGE]';
      const num = String(idx + 1).padStart(3, '0');
      receiptText += `#${num}  ${formatDateTime(e.timestamp)}  ${tag}  ${formatCurrency(e.amount)}\n`;
      if (e.note) receiptText += `      Note: ${e.note}\n`;
      receiptText += `      Subtotal: ${formatCurrency(runningSubtotal)}\n`;
      receiptText += '------------------------------------------\n';
    });

    let totalBonuses = 0;
    let totalCharges = 0;
    entries.forEach(e => {
      if (e.type === 'bonus') totalBonuses += e.amount;
      else totalCharges += e.amount;
    });

    receiptText += '==========================================\n';
    receiptText += `TOTAL BONUSES:  +${formatCurrency(totalBonuses)}\n`;
    receiptText += `TOTAL CHARGES:  -${formatCurrency(totalCharges)}\n`;
    receiptText += `NET BALANCE:    ${formatCurrency(totalBonuses - totalCharges)}\n`;
    receiptText += `TOTAL ENTRIES:  ${entries.length}\n`;
    receiptText += '==========================================\n';

    el.exportTextarea.value = receiptText;
    el.exportModal.classList.add('open');
  });

  el.closeExportBtn.addEventListener('click', () => {
    el.exportModal.classList.remove('open');
  });

  el.copyExportBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(el.exportTextarea.value).then(() => {
      el.copyExportBtn.textContent = 'Copied!';
      setTimeout(() => el.copyExportBtn.textContent = 'Copy', 2000);
    });
  });

  el.downloadTxtBtn.addEventListener('click', () => {
    downloadFile(el.exportTextarea.value, 'receipt_tape.txt', 'text/plain');
  });

  el.downloadCsvBtn.addEventListener('click', () => {
    let csv = 'Index,Date,Type,Amount,Note,RunningBalance\n';
    let running = 0;
    entries.forEach((e, idx) => {
      running += (e.type === 'bonus' ? e.amount : -e.amount);
      const safeNote = `"${(e.note || '').replace(/"/g, '""')}"`;
      csv += `${idx + 1},"${new Date(e.timestamp).toISOString()}",${e.type},${e.amount.toFixed(2)},${safeNote},${running.toFixed(2)}\n`;
    });
    downloadFile(csv, 'tape_ledger.csv', 'text/csv');
  });

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  document.querySelectorAll('.device-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mode = btn.dataset.device;
      el.appWrapper.classList.remove('mode-iphone', 'mode-ipad');
      if (mode === 'iphone') el.appWrapper.classList.add('mode-iphone');
      else if (mode === 'ipad') el.appWrapper.classList.add('mode-ipad');
    });
  });

  el.soundToggle.addEventListener('click', () => {
    sound.enabled = !sound.enabled;
    el.soundToggle.textContent = sound.enabled ? '🔊 Haptics' : '🔇 Muted';
    sound.click();
  });

  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key >= '0' && e.key <= '9') {
      calc.enterDigit(e.key);
      sound.click();
    } else if (e.key === '.') {
      calc.enterDigit('.');
      sound.click();
    } else if (e.key === '+') {
      calc.setOperation('+');
      sound.click();
    } else if (e.key === '-') {
      calc.setOperation('−');
      sound.click();
    } else if (e.key === '*') {
      calc.setOperation('×');
      sound.click();
    } else if (e.key === '/') {
      calc.setOperation('÷');
      sound.click();
    } else if (e.key === 'Enter' || e.key === '=') {
      calc.evaluate();
      sound.click();
    } else if (e.key === 'Backspace') {
      calc.backspace();
      sound.click();
    } else if (e.key === 'Escape') {
      calc.clear();
      sound.click();
    }
    updateCalcScreen();
  });

  loadEntries();
  updateCalcScreen();
})();
