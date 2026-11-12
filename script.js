const SUPABASE_URL = 'https://dtdxutbkeibhbfeampeq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_UXHFL-EbRdejESkEUZ_ArQ_0R3tdCeU';
const REPORTS_ENDPOINT = `${SUPABASE_URL}/rest/v1/community_reports`;
const icons = {
  'ถนนและทางเท้า': '⌁',
  'ความสะอาด': '✳',
  'ไฟฟ้าและแสงสว่าง': '☼',
  'พื้นที่สาธารณะ': '♧'
};
let issues = [];
const grid = document.querySelector('#issue-grid');
const emptyState = document.querySelector('#empty-state');
const toast = document.querySelector('#toast');
let toastTimer;

const themeToggle = document.querySelector('#theme-toggle');
const themeLabel = themeToggle.querySelector('.theme-label');
const savedTheme = localStorage.getItem('community-theme');

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  themeLabel.textContent = nextTheme === 'dark' ? 'โหมดมืด' : 'โหมดสว่าง';
  themeToggle.setAttribute('aria-label', `เปลี่ยนเป็น${themeLabel.textContent}`);
  localStorage.setItem('community-theme', theme);
}

setTheme(savedTheme === 'light' ? 'light' : 'dark');
themeToggle.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function formatDate(value) {
  if (!value) return 'วันนี้';
  return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(new Date(value));
}

function render() {
  const category = document.querySelector('#category-filter').value;
  const status = document.querySelector('#status-filter').value;
  const filtered = issues.filter(issue =>
    (category === 'ทั้งหมด' || issue.category === category) &&
    (status === 'ทั้งหมด' || issue.status === status)
  );

  grid.innerHTML = filtered.map(issue => {
    const statusClass = issue.status === 'แก้ไขแล้ว' ? 'status-done' :
      issue.status === 'กำลังดำเนินการ' ? 'status-progress' : 'status-open';
    return `<article class="issue-card">
      <div class="card-top"><span class="category-tag"><i>${icons[issue.category] || '✳'}</i>${escapeHtml(issue.category)}</span><span class="status ${statusClass}">${escapeHtml(issue.status)}</span></div>
      <h3>${escapeHtml(issue.title)}</h3>
      <p>${escapeHtml(issue.description || 'แจ้งปัญหาเพื่อให้ชุมชนรับทราบและช่วยกันติดตาม')}</p>
      <div class="card-bottom"><span class="location">⌖ ${escapeHtml(issue.location)} · ${escapeHtml(formatDate(issue.created_at))}</span><button class="support" data-support="${issue.id}" aria-label="ร่วมสนับสนุน ${escapeHtml(issue.title)}">♡ <span>สนับสนุน</span></button></div>
    </article>`;
  }).join('');

  emptyState.hidden = filtered.length > 0;
  if (!filtered.length) {
    emptyState.textContent = issues.length
      ? 'ไม่พบรายการที่ตรงกับตัวกรอง ลองเลือกประเภทหรือสถานะอื่นดูนะ'
      : 'ยังไม่มีรายงานในระบบ ลองเป็นคนแรกที่แจ้งปัญหาได้เลย';
  }

  document.querySelectorAll('[data-support]').forEach(button => button.addEventListener('click', () => {
    button.classList.toggle('is-supported');
    button.innerHTML = button.classList.contains('is-supported')
      ? '♥ <span>ขอบคุณที่ร่วมสนับสนุน</span>'
      : '♡ <span>สนับสนุน</span>';
  }));

  document.querySelector('#stat-total').textContent = issues.length;
  document.querySelector('#stat-progress').textContent = issues.filter(issue => issue.status === 'กำลังดำเนินการ').length;
  document.querySelector('#stat-done').textContent = issues.filter(issue => issue.status === 'แก้ไขแล้ว').length;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

async function loadIssues() {
  emptyState.hidden = false;
  emptyState.textContent = 'กำลังโหลดรายการ...';
  try {
    const response = await fetch(`${REPORTS_ENDPOINT}?select=*&order=created_at.desc`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
      }
    });
    if (!response.ok) throw new Error(await response.text());
    issues = await response.json();
    render();
  } catch (error) {
    issues = [];
    render();
    emptyState.textContent = 'โหลดรายการไม่สำเร็จ ตรวจสอบการเชื่อมต่อและการตั้งค่าสิทธิ์ฐานข้อมูล';
    showToast('เชื่อมต่อฐานข้อมูลไม่สำเร็จ ลองรีเฟรชหน้าเว็บอีกครั้ง');
    console.error('Supabase load error:', error);
  }
}

document.querySelector('#category-filter').addEventListener('change', render);
document.querySelector('#status-filter').addEventListener('change', render);

document.querySelector('#report-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('[type="submit"]');
  const data = new FormData(form);
  const report = {
    title: data.get('title').trim(),
    category: data.get('category'),
    location: data.get('location').trim(),
    description: data.get('description').trim()
  };

  submitButton.disabled = true;
  submitButton.textContent = 'กำลังส่ง...';
  try {
    const response = await fetch(REPORTS_ENDPOINT, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(report)
    });
    if (!response.ok) throw new Error(await response.text());
    const inserted = await response.json();
    issues.unshift(...inserted);
    document.querySelector('#category-filter').value = 'ทั้งหมด';
    document.querySelector('#status-filter').value = 'ทั้งหมด';
    render();
    form.reset();
    showToast('ส่งเรื่องเรียบร้อยแล้ว ทุกคนสามารถเห็นรายงานนี้ได้');
    document.querySelector('#issues').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    showToast('ส่งรายงานไม่สำเร็จ ตรวจสอบสิทธิ์ฐานข้อมูลแล้วลองใหม่');
    console.error('Supabase insert error:', error);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'ส่งเรื่องให้ชุมชน <span>↗</span>';
  }
});

render();
loadIssues();
