'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const KEY = 'f3b9d00e4f427e4b78f6b53c90e5908f';
const call = async (path) => {
  const r = await fetch('/api/proxy?path=' + encodeURIComponent(path));
  return r.json();
};
const api = {
  stok: () => call(`/stok_durumu?key=${KEY}`),
  al: (a, c, n) => call(`/numara_al?key=${KEY}&app=${encodeURIComponent(a)}&country=${encodeURIComponent(c)}&adet=${n}`),
  sorgu: (nums) => call(`/kod_sorgula?key=${KEY}&numara=${encodeURIComponent(nums.join(','))}`),
  trafik: () => call(`/live_trafik?key=${KEY}`),
};

const L = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } };
const S = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const getUsers = () => L('yx_users', []);
const setUsers = (u) => S('yx_users', u);
const getNums = () => L('yx_nums', {});
const setNums = (n) => S('yx_nums', n);

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState({ u: '', p: '', g: '' });
  const [err, setErr] = useState('');
  const [view, setView] = useState('traffic');
  const [menuOpen, setMenuOpen] = useState(false);
  const [nums, setNumsState] = useState([]);
  const [stats, setStats] = useState({});
  const pollRef = useRef(null);

  useEffect(() => {
    const s = L('yx_session', null);
    if (s) { setUser(s); setNumsState(getNums()[s.username] || []); }
  }, []);

  useEffect(() => {
    if (user) { S('yx_session', user); setNumsState(getNums()[user.username] || []); }
  }, [user]);

  const persistNums = useCallback((list) => {
    if (!user) return;
    const all = getNums();
    all[user.username] = list;
    setNums(all);
    setNumsState(list);
  }, [user]);

  // otomatik kod sorgu — her 5sn
  useEffect(() => {
    if (!user || nums.length === 0) return;
    const pending = nums.filter(n => !n.code);
    if (pending.length === 0) return;
    const tick = async () => {
      try {
        const res = await api.sorgu(pending.map(n => n.number));
        let updated = false;
        const next = nums.map(n => {
          if (n.code) return n;
          const found = Array.isArray(res) ? res.find(x => x.number === n.number && (x.code || x.sms)) :
                        res?.data?.find?.(x => x.number === n.number);
          const code = found?.code || found?.sms || null;
          if (code) { updated = true; return { ...n, code }; }
          return n;
        });
        if (updated) persistNums(next);
      } catch {}
    };
    tick();
    pollRef.current = setInterval(tick, 5000);
    return () => clearInterval(pollRef.current);
  }, [user, nums, persistNums]);

  const auth = (e) => {
    e.preventDefault();
    setErr('');
    if (!form.u.trim() || !form.p) return setErr('Doldur');
    if (authMode === 'login') {
      if (form.u === 'YxceBerkk' && form.p === 'pwr2010') {
        return setUser({ username: 'YxceBerkk', isAdmin: true, bio: 'Admin', avatar: '' });
      }
      const u = getUsers().find(x => x.username.toLowerCase() === form.u.toLowerCase() && x.password === form.p);
      if (!u) return setErr('Hatalı giriş');
      setUser({ ...u, isAdmin: false });
    } else {
      if (!form.g.trim()) return setErr('Gmail lazım');
      const us = getUsers();
      if (us.find(x => x.username.toLowerCase() === form.u.toLowerCase())) return setErr('Kullanıcı adı dolu');
      if (us.find(x => x.gmail.toLowerCase() === form.g.toLowerCase())) return setErr('Gmail dolu');
      const nu = { username: form.u, password: form.p, gmail: form.g, bio: '', avatar: '', isAdmin: false };
      us.push(nu); setUsers(us); setUser(nu);
    }
  };

  const logout = () => { localStorage.removeItem('yx_session'); setUser(null); setNumsState([]); };

  if (!user) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo"><h1>YXCE OTP</h1><p>Hızlı · Güvenilir · Şık</p></div>
          <div className="auth-welcome">
            <span className="anim">YXCE OTP sitesine hoş geldiniz</span>
          </div>
          <form onSubmit={auth}>
            <div className="field"><label>Kullanıcı Adı</label>
              <input value={form.u} onChange={e => setForm({ ...form, u: e.target.value })} /></div>
            <div className="field"><label>Şifre</label>
              <input type="password" value={form.p} onChange={e => setForm({ ...form, p: e.target.value })} /></div>
            {authMode === 'register' && (
              <div className="field"><label>Gmail</label>
                <input value={form.g} onChange={e => setForm({ ...form, g: e.target.value })} /></div>
            )}
            {err && <div className="auth-error">{err}</div>}
            <button className="btn btn-primary" type="submit">
              {authMode === 'login' ? 'Hesabına Giriş Yap' : 'Kayıt Ol'}
            </button>
            <button type="button" className="btn btn-ghost"
              onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setErr(''); }}>
              {authMode === 'login' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}
      <aside className={'sidebar' + (menuOpen ? ' open' : '')}>
        <div className="brand">YXCE OTP</div>
        {[
          ['traffic', 'Live Trafik'],
          ['buy', 'Numara Al'],
          ['active', 'Aktif Numaralarım'],
          ['query', 'Kod Sorgula'],
          ['profile', 'Profilim'],
          ...(user.isAdmin ? [['admin', 'Admin Paneli']] : []),
        ].map(([k, label]) => (
          <button key={k} className={'nav-item' + (view === k ? ' active' : '')}
            onClick={() => { setView(k); setMenuOpen(false); }}>{label}</button>
        ))}
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setMenuOpen(v => !v)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="top-title">{{
            traffic: 'Live Trafik', buy: 'Numara Al', active: 'Aktif Numaralarım',
            query: 'Kod Sorgula', profile: 'Profilim', admin: 'Admin Paneli'
          }[view]}</div>
          <button className="user-chip" onClick={() => setView('profile')}>
            <div className="avatar">
              {user.avatar ? <img src={user.avatar} alt="" /> : user.username[0]?.toUpperCase()}
            </div>
            <span className="uname">{user.username}</span>
          </button>
        </header>
        <main className="content">
          {view === 'traffic' && <LiveTraffic />}
          {view === 'buy' && <Buy user={user} onBuy={(n) => persistNums([...nums, ...n])} />}
          {view === 'active' && <Active nums={nums} />}
          {view === 'query' && <Query user={user} nums={nums} persist={persistNums} />}
          {view === 'profile' && <Profile user={user} setUser={setUser} logout={logout} />}
          {view === 'admin' && user.isAdmin && <Admin />}
        </main>
      </div>
    </div>
  );
}

function LiveTraffic() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    const load = async () => { try { setData(await api.trafik()); } catch { setErr('Yüklenemedi'); } };
    load(); const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);
  return (
    <div>
      <div className="ptitle">Live Trafik</div>
      <div className="psub">Anlık sistem trafiği — 10 saniyede bir güncellenir</div>
      {err && <div className="auth-error">{err}</div>}
      <div className="card">
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--muted)' }}>
          {data ? JSON.stringify(data, null, 2) : 'Yükleniyor...'}
        </pre>
      </div>
    </div>
  );
}

function Buy({ user, onBuy }) {
  const [stok, setStok] = useState(null);
  const [loading, setLoading] = useState(false);
  const [app, setApp] = useState(null);
  const [countries, setCountries] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => { api.stok().then(setStok).catch(() => setMsg('Stok yüklenemedi')); }, []);

  const apps = (() => {
    if (!stok) return [];
    const src = stok.apps || stok.stok || stok.data || stok;
    if (Array.isArray(src)) return src.map(x => typeof x === 'string' ? { name: x, count: null } : { name: x.name || x.app, count: x.count || x.stock });
    if (typeof src === 'object') return Object.entries(src).map(([k, v]) => ({ name: k, count: typeof v === 'number' ? v : (v?.count ?? null), countries: v?.countries }));
    return [];
  })();

  const chooseApp = (a) => {
    setApp(a);
    if (a.countries) { setCountries(a.countries); return; }
    if (stok?.countries?.[a.name]) { setCountries(stok.countries[a.name]); return; }
    setCountries([]);
  };

  const buy = async (country) => {
    setLoading(true); setMsg('');
    try {
      const res = await api.al(app.name, country, 5);
      const list = (res.numbers || res.data || res || []).map(n => {
        const number = typeof n === 'string' ? n : (n.number || n.numara);
        return { number, app: app.name, country, code: null, boughtAt: Date.now() };
      });
      onBuy(list);
      setMsg(`${list.length} numara alındı`);
      setApp(null); setCountries(null);
    } catch { setMsg('Numara alınamadı'); }
    setLoading(false);
  };

  const countryList = Array.isArray(countries) ? countries : (countries ? Object.keys(countries) : []);

  return (
    <div>
      <div className="ptitle">Numara Al</div>
      <div className="psub">Uygulama ve ülke seç, 5 numara çek</div>
      {msg && <div className="card" style={{ padding: 12, fontSize: 13 }}>{msg}</div>}
      {!app && (
        <div className="grid">
          {apps.length === 0 && <div className="empty">Stok yükleniyor...</div>}
          {apps.map(a => (
            <div key={a.name} className="tile" onClick={() => chooseApp(a)}>
              <div className="tile-name">{a.name}</div>
              {a.count != null && <div className={'tile-stock' + (a.count > 0 ? ' green' : '')}>{a.count} adet</div>}
            </div>
          ))}
        </div>
      )}
      {app && (
        <div>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><b>{app.name}</b> — ülke seç</div>
            <button className="btn-inline" onClick={() => { setApp(null); setCountries(null); }}>Geri</button>
          </div>
          <div className="grid">
            {countryList.length === 0 && <div className="empty">Ülke bulunamadı</div>}
            {countryList.map(c => (
              <div key={c} className="tile" onClick={() => !loading && buy(c)}>
                <div className="tile-name">{c}</div>
                {loading && <div className="tile-stock">alınıyor...</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Active({ nums }) {
  return (
    <div>
      <div className="ptitle">Aktif Numaralarım</div>
      <div className="psub">Aldığın numaralar ve gelen kodlar</div>
      {nums.length === 0 ? <div className="empty">Henüz numara almadın</div> : (
        nums.map(n => (
          <div key={n.number} className="num-row">
            <div>
              <div className="num-val">{n.number}</div>
              <div className="num-app">{n.app} · {n.country}</div>
            </div>
            {n.code ? <div className="num-code">{n.code}</div>
              : <span className="badge badge-yellow">kod bekleniyor</span>}
          </div>
        ))
      )}
    </div>
  );
}

function Query({ user, nums, persist }) {
  const [input, setInput] = useState('');
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const doQuery = async () => {
    const list = input.split(',').map(s => s.trim()).filter(Boolean);
    if (list.length === 0) return;
    setLoading(true);
    try {
      const r = await api.sorgu(list);
      setRes(r);
      const arr = Array.isArray(r) ? r : (r.data || []);
      const next = nums.map(n => {
        const f = arr.find(x => x.number === n.number);
        return f?.code ? { ...n, code: f.code } : n;
      });
      persist(next);
    } catch { setRes({ error: 'sorgu başarısız' }); }
    setLoading(false);
  };
  return (
    <div>
      <div className="ptitle">Kod Sorgula</div>
      <div className="psub">Virgülle ayırarak numara gir</div>
      <div className="card">
        <div className="input-row">
          <input placeholder="905551234567,905551234568" value={input} onChange={e => setInput(e.target.value)} />
          <button className="btn-inline" disabled={loading} onClick={doQuery}>
            {loading ? 'Sorgulanıyor' : 'Sorgula'}
          </button>
        </div>
        {res && (
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
            {JSON.stringify(res, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function Profile({ user, setUser, logout }) {
  const [u, setU] = useState(user);
  const [msg, setMsg] = useState('');

  const save = () => {
    const all = getUsers();
    if (!user.isAdmin) {
      const i = all.findIndex(x => x.username === user.username);
      if (i !== -1) { all[i] = { ...all[i], ...u }; setUsers(all); }
    }
    setUser({ ...user, ...u });
    setMsg('Kaydedildi');
    setTimeout(() => setMsg(''), 2000);
  };

  const upload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setU({ ...u, avatar: reader.result });
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="ptitle">Profilim</div>
      <div className="psub">Bilgilerini güncelle</div>
      {msg && <div className="card" style={{ padding: 12, fontSize: 13, color: '#4ade80' }}>{msg}</div>}
      <div className="card">
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
          <div className="avatar" style={{ width: 80, height: 80, fontSize: 30 }}>
            {u.avatar ? <img src={u.avatar} alt="" /> : u.username[0]?.toUpperCase()}
          </div>
          <div>
            <label className="btn btn-ghost" style={{ display: 'inline-block', padding: '10px 16px', cursor: 'pointer', width: 'auto', marginTop: 0 }}>
              Fotoğraf Değiştir
              <input type="file" accept="image/*" hidden onChange={upload} />
            </label>
          </div>
        </div>
        <div className="field"><label>Kullanıcı Adı</label>
          <input value={u.username} onChange={e => setU({ ...u, username: e.target.value })} disabled={user.isAdmin} /></div>
        <div className="field"><label>Şifre</label>
          <input type="password" value={u.password || ''} onChange={e => setU({ ...u, password: e.target.value })} /></div>
        <div className="field"><label>Gmail</label>
          <input value={u.gmail || ''} onChange={e => setU({ ...u, gmail: e.target.value })} disabled={user.isAdmin} /></div>
        <div className="field"><label>Bio</label>
          <input value={u.bio || ''} onChange={e => setU({ ...u, bio: e.target.value })} /></div>
        <button className="btn btn-primary" onClick={save}>Kaydet</button>
        <button className="btn btn-ghost" onClick={logout}>Çıkış Yap</button>
      </div>
    </div>
  );
}

function Admin() {
  const users = getUsers();
  const allNums = getNums();
  const ranked = users.map(u => ({ name: u.username, count: (allNums[u.username] || []).length }))
    .sort((a, b) => b.count - a.count);
  return (
    <div>
      <div className="ptitle">Admin Paneli</div>
      <div className="psub">Kayıtlı kullanıcılar ve aldıkları numara sayısı</div>
      <div className="card">
        {ranked.length === 0 && <div className="empty">Kayıtlı kullanıcı yok</div>}
        {ranked.map((r, i) => (
          <div key={r.name} className="rank-row">
            <div className={'rank-pos' + (i < 3 ? ' top' + (i + 1) : '')}>{i + 1}</div>
            <div className="rank-info">
              <div className="rank-name">{r.name}</div>
              <div className="rank-count">{r.count} numara</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
      }
