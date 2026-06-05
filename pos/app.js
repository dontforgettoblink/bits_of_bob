const STORAGE_KEY = 'tag-sale-pos-history';

let cart = [];

// ── DOM refs ──
const itemName      = document.getElementById('item-name');
const itemPrice     = document.getElementById('item-price');
const addBtn        = document.getElementById('add-btn');
const cartList      = document.getElementById('cart-list');
const subtotalEl    = document.getElementById('subtotal');
const discountVal   = document.getElementById('discount-val');
const discountType  = document.getElementById('discount-type');
const totalEl       = document.getElementById('total');
const cashTendered  = document.getElementById('cash-tendered');
const changeDue     = document.getElementById('change-due');
const completeBtn   = document.getElementById('complete-btn');
const clearBtn      = document.getElementById('clear-btn');
const sessionAmount = document.getElementById('session-amount');
const historyList   = document.getElementById('history-list');
const saleCount     = document.getElementById('sale-count');
const clearHistBtn  = document.getElementById('clear-history-btn');

// ── Helpers ──
function fmt(n) {
  return '$' + Math.abs(n).toFixed(2);
}

function getSubtotal() {
  return cart.reduce((s, i) => s + i.price, 0);
}

function getDiscount(subtotal) {
  const v = parseFloat(discountVal.value) || 0;
  if (discountType.value === 'percent') return subtotal * (v / 100);
  return Math.min(v, subtotal);
}

function getTotal() {
  const sub = getSubtotal();
  return Math.max(0, sub - getDiscount(sub));
}

// ── Render cart ──
function renderCart() {
  if (cart.length === 0) {
    cartList.innerHTML = '<p class="empty-msg">No items yet.</p>';
  } else {
    cartList.innerHTML = cart.map((item, i) => `
      <div class="cart-item">
        <span class="cart-item-name">${escHtml(item.name)}</span>
        <span class="cart-item-price">${fmt(item.price)}</span>
        <button class="remove-btn" data-idx="${i}" title="Remove">×</button>
      </div>
    `).join('');
    cartList.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        cart.splice(Number(btn.dataset.idx), 1);
        refreshAll();
      });
    });
  }

  const sub = getSubtotal();
  const total = getTotal();
  subtotalEl.textContent = fmt(sub);
  totalEl.textContent = fmt(total);
  updateChange();
}

function updateChange() {
  const cash = parseFloat(cashTendered.value);
  const total = getTotal();
  if (isNaN(cash) || cashTendered.value === '') {
    changeDue.textContent = '—';
    changeDue.classList.remove('negative');
    return;
  }
  const change = cash - total;
  changeDue.textContent = (change < 0 ? '-' : '') + fmt(change);
  changeDue.classList.toggle('negative', change < 0);
}

function refreshAll() {
  renderCart();
}

// ── Add item ──
function addItem() {
  const name  = itemName.value.trim() || 'Item';
  const price = parseFloat(itemPrice.value);
  if (isNaN(price) || price < 0) {
    itemPrice.focus();
    return;
  }
  cart.push({ name, price });
  itemName.value  = '';
  itemPrice.value = '';
  itemName.focus();
  refreshAll();
}

addBtn.addEventListener('click', addItem);

itemPrice.addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});

itemName.addEventListener('keydown', e => {
  if (e.key === 'Enter') itemPrice.focus();
});

// ── Quick price buttons ──
document.querySelectorAll('.qp').forEach(btn => {
  btn.addEventListener('click', () => {
    itemPrice.value = btn.dataset.price;
    if (!itemName.value.trim()) itemName.focus();
    else addItem();
  });
});

// ── Discount & cash inputs live-update ──
discountVal.addEventListener('input', refreshAll);
discountType.addEventListener('change', refreshAll);
cashTendered.addEventListener('input', updateChange);

// ── Clear cart ──
clearBtn.addEventListener('click', () => {
  cart = [];
  discountVal.value    = '';
  cashTendered.value   = '';
  refreshAll();
});

// ── Complete sale ──
completeBtn.addEventListener('click', () => {
  if (cart.length === 0) return;
  const cash = parseFloat(cashTendered.value);
  const total = getTotal();
  if (isNaN(cash) || cash < total) {
    cashTendered.focus();
    return;
  }

  const sub      = getSubtotal();
  const discount = getDiscount(sub);
  const change   = cash - total;

  const entry = {
    id:       Date.now(),
    time:     new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date:     new Date().toLocaleDateString(),
    items:    [...cart],
    subtotal: sub,
    discount,
    total,
    cash,
    change,
  };

  saveHistory(entry);

  cart = [];
  discountVal.value  = '';
  cashTendered.value = '';
  refreshAll();
  renderHistory();
});

// ── History storage ──
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveHistory(entry) {
  const h = loadHistory();
  h.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
}

// ── Render history ──
function renderHistory() {
  const history = loadHistory();
  const sessionTotal = history.reduce((s, e) => s + e.total, 0);
  sessionAmount.textContent = fmt(sessionTotal);
  saleCount.textContent = history.length === 1 ? '1 sale' : `${history.length} sales`;

  if (history.length === 0) {
    historyList.innerHTML = '<p class="empty-msg">No sales recorded yet.</p>';
    return;
  }

  historyList.innerHTML = history.map(e => `
    <div class="history-entry">
      <div class="history-entry-header" data-id="${e.id}">
        <span class="history-entry-time">${e.date} ${e.time}</span>
        <span class="history-entry-total">${fmt(e.total)}</span>
      </div>
      <div class="history-entry-detail" id="detail-${e.id}">
        ${e.items.map(i => `
          <div class="history-detail-row">
            <span>${escHtml(i.name)}</span>
            <span>${fmt(i.price)}</span>
          </div>
        `).join('')}
        ${e.discount > 0 ? `<div class="history-detail-row"><span>Discount</span><span>-${fmt(e.discount)}</span></div>` : ''}
        <div class="history-detail-row sum"><span>Total</span><span>${fmt(e.total)}</span></div>
        <div class="history-detail-row"><span>Cash</span><span>${fmt(e.cash)}</span></div>
        <div class="history-detail-row"><span>Change</span><span>${fmt(e.change)}</span></div>
      </div>
    </div>
  `).join('');

  historyList.querySelectorAll('.history-entry-header').forEach(header => {
    header.addEventListener('click', () => {
      const detail = document.getElementById(`detail-${header.dataset.id}`);
      detail.classList.toggle('open');
    });
  });
}

clearHistBtn.addEventListener('click', () => {
  if (!confirm('Clear all sales history?')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
});

// ── XSS guard ──
function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Init ──
renderCart();
renderHistory();
