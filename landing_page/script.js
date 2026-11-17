/* ==========================================================================
   Body Scent — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   ========================================================================== */

var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzZukJq6uoGdfmDHV-egm4eovogaMpcTy6-UfsVSmZt5VnhhQ0hOlgr_AOgfgZunSpk/exec';
var SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQmPinTGAW-jFOFSFkp-7ARADoGcZ76nwxaz-RxQhw-qDnQrjO-ADeMmGxvZy9mDvn3GhkqXYmcVB10/pub?gid=0&single=true&output=csv';

var MOODS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'fresh', label: 'Fresh' },
  { key: 'sweet', label: 'Sweet' },
  { key: 'confident', label: 'Confident' },
  { key: 'romance', label: 'Romance' }
];

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('product-list')) initProductPage();
  if (document.getElementById('orderForm')) initOrderPage();
  if (document.querySelector('#ordersTable tbody')) initAdminPage();
});

/* --------------------------------------------------------------------------
   Helper: สร้าง element ด้วย DOM (ใช้ textContent เพื่อความปลอดภัย)
   -------------------------------------------------------------------------- */
function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

/* ==========================================================================
   1) หน้า product.html
   ========================================================================== */
function initProductPage() {
  var filterBar = document.getElementById('filter-bar');
  var listEl = document.getElementById('product-list');
  var products = [];
  var currentMood = 'all';

  // อ่าน ?mood=xxx
  var moodParam = (new URLSearchParams(window.location.search).get('mood') || '').toLowerCase();
  var isValidMood = MOODS.some(function (m) { return m.key === moodParam; });
  if (isValidMood) currentMood = moodParam;

  function renderFilterBar() {
    if (!filterBar) return;
    filterBar.innerHTML = '';
    MOODS.forEach(function (m) {
      var btn = el('button', 'filter__btn');
      btn.type = 'button';
      btn.dataset.mood = m.key;
      if (m.key !== 'all') {
        btn.appendChild(el('span', 'mood-dot mood-dot--' + m.key));
      }
      btn.appendChild(document.createTextNode(m.label));
      if (m.key === currentMood) btn.classList.add('is-active');
      btn.addEventListener('click', function () {
        currentMood = m.key;
        renderFilterBar();
        renderProducts();
      });
      filterBar.appendChild(btn);
    });
  }

  function buildOrderUrl(p) {
    var itemName = p.size ? p.name + ' ' + p.size : p.name;
    var params = new URLSearchParams({ item: itemName, price: p.price });
    return 'order.html?' + params.toString();
  }

  function buildCard(p) {
    var card = el('article', 'product-card');

    var media = el('div', 'product-card__media');
    var img = document.createElement('img');
    img.src = p.image;
    img.alt = p.name;
    img.loading = 'lazy';
    media.appendChild(img);
    card.appendChild(media);

    var body = el('div', 'product-card__body');

    var label = el('span', 'mood-label');
    label.appendChild(el('span', 'mood-dot mood-dot--' + p.mood));
    label.appendChild(document.createTextNode(p.mood));
    body.appendChild(label);

    body.appendChild(el('h3', 'product-card__title', p.name));
    if (p.size) {
      body.appendChild(el('p', 'product-card__meta', p.size));
    }

    var footer = el('div', 'product-card__footer');
    var price = el('span', 'price', Number(p.price).toLocaleString('th-TH'));
    price.appendChild(el('small', null, 'บาท'));
    footer.appendChild(price);

    var buy = el('a', 'btn btn--accent', 'สั่งซื้อ');
    buy.href = buildOrderUrl(p);
    footer.appendChild(buy);

    body.appendChild(footer);
    card.appendChild(body);
    return card;
  }

  function renderProducts() {
    listEl.innerHTML = '';
    var filtered = products.filter(function (p) {
      return currentMood === 'all' || p.mood === currentMood;
    });
    if (filtered.length === 0) {
      listEl.appendChild(el('p', 'text-center', 'ไม่พบสินค้าในหมวดนี้'));
      return;
    }
    filtered.forEach(function (p) {
      listEl.appendChild(buildCard(p));
    });
  }

  renderFilterBar();

  fetch('products.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      products = data;
      renderProducts();
    })
    .catch(function (error) {
      console.error(error);
      listEl.innerHTML = '';
      listEl.appendChild(el('p', 'text-center', 'ไม่สามารถโหลดข้อมูลสินค้าได้ กรุณาลองใหม่อีกครั้ง'));
    });
}

/* ==========================================================================
   2) หน้า order.html
   ========================================================================== */
function initOrderPage() {
  var form = document.getElementById('orderForm');
  var params = new URLSearchParams(window.location.search);

  // เติมค่าจาก URL ลงช่อง items และ total ทันทีที่โหลดหน้า
  var itemsInput = document.getElementById('items');
  var totalInput = document.getElementById('total');
  var item = params.get('item');
  var price = params.get('price');
  if (itemsInput && item !== null) itemsInput.value = item;
  if (totalInput && price !== null) totalInput.value = price;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var payload = {
      customerName: document.getElementById('customerName').value.trim(),
      contact: document.getElementById('contact').value.trim(),
      items: document.getElementById('items').value.trim(),
      total: document.getElementById('total').value.trim(),
      note: document.getElementById('note').value.trim()
    };

    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
      .then(() => { window.location.href = 'thankyou.html'; })
      .catch(error => {
        console.error(error);
        if (submitBtn) submitBtn.disabled = false;
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      });
  });
}

/* ==========================================================================
   3) หน้า admin.html
   ========================================================================== */
function initAdminPage() {
  var tbody = document.querySelector('#ordersTable tbody');
  var COLS = 6;

  function showMessage(text) {
    tbody.innerHTML = '';
    var tr = document.createElement('tr');
    var td = el('td', 'text-center', text);
    td.colSpan = COLS;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  showMessage('กำลังโหลดข้อมูล...');

  fetch(SHEET_CSV_URL, { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function (text) {
      var rows = parseCSV(text);
      rows.shift(); // ตัดแถวหัวตาราง (ถ้ามี) ออก

      // ตัดแถวว่าง
      rows = rows.filter(function (r) {
        return r.some(function (cell) { return cell.trim() !== ''; });
      });

      // Sheet ถูกเพิ่มแถวต่อท้ายตามลำดับเวลา จึงกลับลำดับเพื่อให้รายการล่าสุดขึ้นก่อน
      rows.reverse();

      if (rows.length === 0) {
        showMessage('ยังไม่มีรายการสั่งซื้อ');
        return;
      }

      tbody.innerHTML = '';
      rows.forEach(function (r) {
        var tr = document.createElement('tr');
        for (var i = 0; i < COLS; i++) {
          tr.appendChild(el('td', null, r[i] !== undefined ? r[i] : ''));
        }
        tbody.appendChild(tr);
      });
    })
    .catch(function (error) {
      console.error(error);
      showMessage('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    });
}

/* --------------------------------------------------------------------------
   ฟังก์ชัน parse CSV (รองรับ "..." , "" แทนเครื่องหมายคำพูด,
   คอมมาและขึ้นบรรทัดใหม่ภายในช่อง, CRLF/LF)
   -------------------------------------------------------------------------- */
function parseCSV(text) {
  var rows = [];
  var row = [];
  var field = '';
  var inQuotes = false;

  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // ตัด BOM

  for (var i = 0; i < text.length; i++) {
    var ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  // แถวสุดท้ายที่ไม่มี newline ปิดท้าย
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
