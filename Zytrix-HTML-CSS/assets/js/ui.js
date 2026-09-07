import { auth, onAuthStateChanged, getProfile } from './firebase.js';

export function escapeHtml(value='') {
  return String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export function safeHttpUrl(value='', {allowDataImage=false}={}) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (allowDataImage && /^data:image\/(png|jpe?g|webp|gif);/i.test(raw)) return raw;
  try {
    const u = new URL(raw, location.origin);
    return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
  } catch { return ''; }
}

export function header(active='') {
  const host = document.querySelector('[data-header]');
  if (!host) return;
  const link = (id, href, label) => `<a href="${href}" class="${active===id?'active-link':''}">${label}</a>`;
  host.innerHTML = `<header class="header"><div class="container nav">
    <a class="logo" href="index.html"><span class="logo-icon">Z</span><span>Zytrix</span></a>
    <nav class="nav-links">${link('home','index.html','Início')}${link('categorias','categorias.html','Categorias')}${link('ao-vivo','ao-vivo.html','Ao vivo')}${link('sobre','sobre.html','Sobre')}</nav>
    <div class="nav-actions" id="nav-auth"><a class="btn" href="login.html">Entrar</a><a class="btn btn-primary" href="registro.html">Criar conta</a></div>
    <button class="menu-btn" type="button" aria-label="Abrir menu" aria-expanded="false">☰</button>
  </div><div class="mobile-menu hidden"></div></header>`;
  const menuBtn = host.querySelector('.menu-btn');
  const mobile = host.querySelector('.mobile-menu');
  const updateMobile = () => {
    mobile.innerHTML = `<div class="container mobile-links">${link('home','index.html','Início')}${link('categorias','categorias.html','Categorias')}${link('ao-vivo','ao-vivo.html','Ao vivo')}${link('sobre','sobre.html','Sobre')}<a href="perfil.html">Perfil</a><a href="loja.html">Zy Coins</a></div>`;
  };
  updateMobile();
  menuBtn?.addEventListener('click', () => {
    const open = mobile.classList.toggle('hidden') === false;
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  onAuthStateChanged(auth, async user => {
    const box = document.querySelector('#nav-auth');
    if (!box) return;
    if (!user) {
      box.innerHTML = '<a class="btn" href="login.html">Entrar</a><a class="btn btn-primary" href="registro.html">Criar conta</a>';
      return;
    }
    const profile = await getProfile(user.uid).catch(()=>null);
    const name = escapeHtml(profile?.username || user.displayName || 'Conta');
    box.innerHTML = `<a class="btn" href="loja.html">◈ Zy Coins</a><a class="btn" href="perfil.html">${name}</a><a class="btn" href="sair.html">Sair</a>`;
  });
}

export function footer() {
  const host = document.querySelector('[data-footer]');
  if (!host) return;
  host.innerHTML = `<footer><div class="container footer-content"><a class="logo" href="index.html"><span class="logo-icon">Z</span><span>Zytrix</span></a><p>© 2026 Zytrix. Projeto acadêmico de livestream.</p><div class="footer-links"><a href="sobre.html">Sobre</a><a href="loja.html">Zy Coins</a></div></div></footer>`;
}

export function setState(el, message, kind='') {
  if (!el) return;
  el.textContent = message;
  el.className = `message ${kind}`.trim();
}
