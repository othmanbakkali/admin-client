import { useState, useEffect } from 'react';
import { Save, Lock, ArrowLeft, AreaChart as ChartIcon, User, Users, UserPlus, CheckCircle, XCircle, Shield, Activity, Smartphone, Server, MessageSquare, ChevronLeft, ChevronRight, BarChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as ReBarChart, Bar, Cell } from 'recharts';
import { translations } from './translations';

const SERVER_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001' 
  : 'https://goldprojectbackend-production.up.railway.app';

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  if (typeof dateStr === 'string' && dateStr.includes(' ') && !dateStr.includes('T')) {
    return new Date(dateStr.replace(' ', 'T') + 'Z');
  }
  return new Date(dateStr);
};

export default function App() {
  const [price, setPrice] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [username, setUsername] = useState(localStorage.getItem('admin_user') || '');
  const [password, setPassword] = useState(localStorage.getItem('admin_pass') || '');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('price');
  const [usersList, setUsersList] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({ activeConnections: [], connectionHistory: [], installations: { android: 0, ios: 0, total: 0 }, priceHistory: [] });
  const [connStats, setConnStats] = useState({ hourly: [], daily: [], weekly: [], monthly: [] });
  const [statsPeriod, setStatsPeriod] = useState('hourly');
  const [connPage, setConnPage] = useState(1);
  const connPerPage = 10;
  const [pricePage, setPricePage] = useState(1);
  const pricePerPage = 10;
  const [historyPage, setHistoryPage] = useState(1);
  const historyPerPage = 15;
  const [footerMessage, setFooterMessage] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', isActive: true });
  const [editingUser, setEditingUser] = useState(null); // { id, username, password, isActive }
  const [pricesList, setPricesList] = useState([]);
  const [editingPrice, setEditingPrice] = useState(null); // { id, price }
  const [lang, setLang] = useState('fr');
  const t = translations[lang].admin;

  // Sauvegarder les identifiants quand ils changent
  useEffect(() => {
    localStorage.setItem('admin_user', username);
    localStorage.setItem('admin_pass', password);
  }, [username, password]);

  const handleLogout = () => {
    setUsername('');
    setPassword('');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_pass');
    setStatus({ type: 'success', message: 'Déconnecté avec succès' });
  };

  // Fetch current price to populate form
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/price`);
        if (response.ok) {
          const data = await response.json();
          
          if (data) {
            if (data.price !== undefined) {
              setPrice(data.price.toString());
            }

            if (data.date) {
              setLastUpdated(data.date);
            }
          }
        }
      } catch (err) {
        console.error('Erreur lors de la récupération du prix actuel:', err);
        setStatus({ type: 'error', message: t.connError });
      }
    };
    fetchPrice();
  }, [t.connError]);

  // Fetch footer message
  useEffect(() => {
    const fetchFooter = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/settings/footer`);
        if (response.ok) {
          const data = await response.json();
          setFooterMessage(data.message || '');
        }
      } catch (err) {
        console.error('Erreur fetch footer:', err);
      }
    };
    fetchFooter();
  }, []);

  const fetchPrices = async () => {
    if (!username || !password) return;
    try {
      const response = await fetch(`${SERVER_URL}/api/admin/prices?username=${username}&password=${password}`);
      if (response.ok) {
        const data = await response.json();
        setPricesList(data);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération de la liste des prix:", err);
    }
  };

  const handleUpdatePrice = async (e) => {
    e.preventDefault();
    if (!username || !password || !editingPrice) return;
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/price/${editingPrice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          password: password,
          price: parseFloat(editingPrice.price)
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setStatus({ type: 'success', message: 'Prix mis à jour avec succès' });
        setEditingPrice(null);
        fetchPrices();
        if (activeTab === 'dashboard') {
          fetchDashboardStats();
        }
      } else {
        setStatus({ type: 'error', message: data.error });
      }
    } catch (err) {
      setStatus({ type: 'error', message: t.connError });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrice = async (priceId) => {
    const confirmDelete = window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا السعر؟' : 'Êtes-vous sûr de vouloir supprimer ce prix ?');
    if (!confirmDelete) return;

    if (!username || !password) return;
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/price/${priceId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          password: password
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setStatus({ type: 'success', message: 'Prix supprimé avec succès' });
        fetchPrices();
        if (activeTab === 'dashboard') {
          fetchDashboardStats();
        }
      } else {
        setStatus({ type: 'error', message: data.error });
      }
    } catch (err) {
      setStatus({ type: 'error', message: t.connError });
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    if (!username || !password) {
      setStatus({ type: 'error', message: 'Entrez vos identifiants pour effectuer une sauvegarde.' });
      return;
    }
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const response = await fetch(`${SERVER_URL}/api/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (response.ok) {
        setStatus({ type: 'success', message: data.message || 'Sauvegarde effectuée avec succès.' });
      } else {
        setStatus({ type: 'error', message: data.error || 'Erreur lors de la sauvegarde.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: t.connError });
    } finally {
      setLoading(false);
    }
  };

  // Fetch prices list when price tab is active and credentials are set
  useEffect(() => {
    if (activeTab === 'price' && username && password) {
      fetchPrices();
    }
  }, [activeTab, username, password]);

  const fetchUsers = async () => {
    if (!username || !password) {
      setStatus({ type: 'error', message: 'Entrez vos identifiants pour voir les utilisateurs.' });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/users?username=${username}&password=${password}`);
      const data = await response.json();
      if (response.ok) {
        setUsersList(data);
        setStatus({ type: '', message: '' });
      } else {
        setStatus({ type: 'error', message: data.error || 'Erreur d\'authentification' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: t.connError });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFooter = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/settings/footer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          password: password,
          message: footerMessage
        }),
      });
      if (response.ok) {
        setStatus({ type: 'success', message: 'Message de pied de page mis à jour' });
      } else {
        const data = await response.json();
        setStatus({ type: 'error', message: data.error || 'Erreur' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: t.connError });
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    if (!username || !password) {
      setStatus({ type: 'error', message: 'Entrez vos identifiants pour voir le dashboard.' });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/dashboard/stats?username=${username}&password=${password}`);
      const data = await response.json();
      if (response.ok) {
        setDashboardStats(data);
        setStatus({ type: '', message: '' });
      } else {
        setStatus({ type: 'error', message: data.error || 'Erreur dashboard' });
      }
      
      // Also fetch connection stats for graphs
      const statsRes = await fetch(`${SERVER_URL}/api/dashboard/connection-stats?username=${username}&password=${password}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setConnStats(statsData);
      }
    } catch (err) {
      setStatus({ type: 'error', message: t.connError });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUser: username,
          adminPass: password,
          newUsername: newUser.username,
          newPassword: newUser.password,
          isActive: newUser.isActive
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setStatus({ type: 'success', message: 'Utilisateur ajouté avec succès' });
        setNewUser({ username: '', password: '', isActive: true });
        fetchUsers();
      } else {
        setStatus({ type: 'error', message: data.error });
      }
    } catch (err) {
      setStatus({ type: 'error', message: t.connError });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    if (!username || !password) return;
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUser: username,
          adminPass: password,
          isActive: !currentStatus
        }),
      });
      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        setStatus({ type: 'error', message: data.error });
      }
    } catch (err) {
      setStatus({ type: 'error', message: t.connError });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!username || !password || !editingUser) return;
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUser: username,
          adminPass: password,
          username: editingUser.username,
          password: editingUser.password,
          isActive: editingUser.isActive
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setStatus({ type: 'success', message: 'Utilisateur mis à jour avec succès' });
        setEditingUser(null);
        fetchUsers();
      } else {
        setStatus({ type: 'error', message: data.error });
      }
    } catch (err) {
      setStatus({ type: 'error', message: t.connError });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`${SERVER_URL}/api/price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          newPrice: parseFloat(price),
          password: password,
          currency: 'MAD',
          unit: 'g'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({
          type: 'success',
          message: t.success
        });
        if (data.data && data.data.date) {
          setLastUpdated(data.data.date);
        }
        fetchPrices();
      } else {
        setStatus({
          type: 'error',
          message: data.error || 'Erreur lors de la mise à jour'
        });
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: t.connError
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="admin-card" style={{ position: 'relative' }}>
        
        <div style={{ position: 'absolute', top: '1.5rem', right: lang === 'ar' ? 'auto' : '1.5rem', left: lang === 'ar' ? '1.5rem' : 'auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {(username || password) && (
            <button 
              onClick={handleLogout}
              style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
            >
              {lang === 'ar' ? 'خروج' : 'Déconnexion'}
            </button>
          )}
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value)}
            style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', outline: 'none' }}
          >
            <option value="fr" style={{color: '#000'}}>FR</option>
            <option value="en" style={{color: '#000'}}>EN</option>
            <option value="ar" style={{color: '#000'}}>AR</option>
            <option value="es" style={{color: '#000'}}>ES</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <a href="https://goldprojectbackend-production.up.railway.app" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <ArrowLeft size={16} /> {t.backToTv}
          </a>
          <a href="https://goldprojectbackend-production.up.railway.app/#/chart" style={{ color: 'var(--gold-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <ChartIcon size={16} /> {lang === 'ar' ? 'عرض الرسم البياني' : 'Voir graphique'}
          </a>
        </div>
        <h1>{t.title}</h1>
        
        <div className="form-group" style={{ display: 'flex', gap: '1rem', flexDirection: lang === 'ar' ? 'row-reverse' : 'row', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="username">{t.usernameLabel || "Nom d'utilisateur"}</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', top: '50%', left: lang === 'ar' ? 'auto' : '1rem', right: lang === 'ar' ? '1rem' : 'auto', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                id="username"
                required
                className="form-input"
                style={{ paddingLeft: lang === 'ar' ? '1rem' : '3rem', paddingRight: lang === 'ar' ? '3rem' : '1rem' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.usernamePlaceholder || "Admin"}
              />
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <label htmlFor="password">{t.passwordLabel || "Mot de passe"}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', top: '50%', left: lang === 'ar' ? 'auto' : '1rem', right: lang === 'ar' ? '1rem' : 'auto', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                id="password"
                required
                className="form-input"
                style={{ paddingLeft: lang === 'ar' ? '1rem' : '3rem', paddingRight: lang === 'ar' ? '3rem' : '1rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #333' }}>
          <button 
            type="button"
            onClick={() => setActiveTab('price')}
            style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: 'none', color: activeTab === 'price' ? 'var(--gold-primary)' : 'var(--text-muted)', borderBottom: activeTab === 'price' ? '2px solid var(--gold-primary)' : 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {lang === 'ar' ? 'تحديث السعر' : lang === 'en' ? 'Update Price' : lang === 'es' ? 'Actualizar Precio' : 'Prix de l\'or'}
          </button>
          <button 
            type="button"
            onClick={() => {
              setActiveTab('users');
              fetchUsers();
            }}
            style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: 'none', color: activeTab === 'users' ? 'var(--gold-primary)' : 'var(--text-muted)', borderBottom: activeTab === 'users' ? '2px solid var(--gold-primary)' : 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Users size={18} /> {lang === 'ar' ? 'المستخدمين' : lang === 'en' ? 'Users' : lang === 'es' ? 'Usuarios' : 'Utilisateurs'}
          </button>
          <button 
            type="button"
            onClick={() => {
              setActiveTab('dashboard');
              fetchDashboardStats();
            }}
            style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: 'none', color: activeTab === 'dashboard' ? 'var(--gold-primary)' : 'var(--text-muted)', borderBottom: activeTab === 'dashboard' ? '2px solid var(--gold-primary)' : 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Activity size={18} /> Dashboard
          </button>
        </div>

        {activeTab === 'price' ? (
          <>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="price">{t.priceLabel}</label>
                <input
                  type="number"
                  id="price"
                  step="0.01"
                  min="0"
                  required
                  className="form-input"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={t.pricePlaceholder}
                />
              </div>

              <button 
                type="submit" 
                className="btn-primary"
                disabled={loading}
              >
                {loading ? t.submitting : (
                  <>
                    <Save size={20} />
                    {t.submitBtn}
                  </>
                )}
              </button>
            </form>

            <hr style={{ margin: '2rem 0', opacity: 0.1 }} />

            <form onSubmit={handleUpdateFooter} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gold-primary)' }}>
                <MessageSquare size={18} /> Message personnalisé en bas de page
              </h3>
              <div className="form-group">
                <textarea 
                  className="form-input"
                  rows="3"
                  value={footerMessage}
                  onChange={(e) => setFooterMessage(e.target.value)}
                  placeholder="Ex: Bienvenue sur notre plateforme de suivi du prix de l'or..."
                  style={{ resize: 'vertical', minHeight: '80px', paddingTop: '0.75rem' }}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: 'auto', padding: '0.6rem 1.5rem' }}>
                {loading ? '...' : 'Mettre à jour le message'}
              </button>
            </form>

            <hr style={{ margin: '2rem 0', opacity: 0.1 }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} /> {lang === 'ar' ? 'تاريخ تغيير الأسعار' : 'Historique des changements de prix'}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button 
                  type="button"
                  onClick={() => setPricePage(p => Math.max(1, p - 1))}
                  disabled={pricePage === 1}
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '4px', borderRadius: '4px', cursor: 'pointer', opacity: pricePage === 1 ? 0.3 : 1 }}
                >
                  <ChevronLeft size={18} />
                </button>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Page {pricePage}</span>
                <button 
                  type="button"
                  onClick={() => setPricePage(p => p + 1)}
                  disabled={pricePage * pricePerPage >= pricesList.length}
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '4px', borderRadius: '4px', cursor: 'pointer', opacity: pricePage * pricePerPage >= pricesList.length ? 0.3 : 1 }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', overflow: 'hidden', marginBottom: '2rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: lang === 'ar' ? 'right' : 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333', background: 'rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '0.75rem', textAlign: lang === 'ar' ? 'right' : 'left' }}>Date</th>
                    <th style={{ padding: '0.75rem', textAlign: lang === 'ar' ? 'right' : 'left' }}>Prix</th>
                    <th style={{ padding: '0.75rem', textAlign: lang === 'ar' ? 'right' : 'left' }}>Utilisateur</th>
                    <th style={{ padding: '0.75rem', textAlign: lang === 'ar' ? 'right' : 'left' }}>IP</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pricesList.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: 'gray' }}>{lang === 'ar' ? 'لا يوجد سجل أو تم رفض الوصول.' : 'Aucun historique ou accès refusé.'}</td></tr>
                  ) : pricesList.slice((pricePage - 1) * pricePerPage, pricePage * pricePerPage).map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '0.75rem' }}>{parseDate(h.date)?.toLocaleString('fr-FR', { timeZone: 'Africa/Casablanca' })}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 'bold', color: 'var(--gold-primary)' }}>
                        {editingPrice?.id === h.id ? (
                          <input 
                            type="number" 
                            step="0.01"
                            min="0"
                            className="form-input" 
                            value={editingPrice.price} 
                            onChange={e => setEditingPrice({...editingPrice, price: e.target.value})}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem', width: '120px' }}
                          />
                        ) : (
                          `${h.price} ${h.currency || 'MAD'}/${h.unit || 'g'}`
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{h.username || 'Inconnu'}</td>
                      <td style={{ padding: '0.75rem' }}>{h.ip_address || 'N/A'}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          {editingPrice?.id === h.id ? (
                            <>
                              <button type="button" onClick={handleUpdatePrice} className="btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}>Sauver</button>
                              <button type="button" onClick={() => setEditingPrice(null)} style={{ background: 'gray', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Annuler</button>
                            </>
                          ) : (
                            <>
                              <button 
                                type="button"
                                onClick={() => setEditingPrice({ id: h.id, price: h.price })} 
                                style={{ background: 'var(--gold-primary)', color: 'black', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                              >
                                {lang === 'ar' ? 'تعديل' : 'Modifier'}
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleDeletePrice(h.id)}
                                disabled={loading}
                                style={{ 
                                  background: '#ef4444', 
                                  color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'
                                }}
                              >
                                {lang === 'ar' ? 'حذف' : 'Supprimer'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : activeTab === 'users' ? (
          <div className="users-management">
            <form onSubmit={handleAddUser} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><UserPlus size={16} /> Ajouter un utilisateur</h3>
              <div style={{ display: 'flex', gap: '1rem', flexDirection: lang === 'ar' ? 'row-reverse' : 'row' }}>
                <input 
                  type="text" 
                  placeholder="Username" 
                  className="form-input" 
                  required 
                  value={newUser.username} 
                  onChange={e => setNewUser({...newUser, username: e.target.value})} 
                  style={{ flex: 1 }} 
                />
                <input 
                  type="password" 
                  placeholder="Password" 
                  className="form-input" 
                  required 
                  value={newUser.password} 
                  onChange={e => setNewUser({...newUser, password: e.target.value})} 
                  style={{ flex: 1 }} 
                />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '0.5rem' }} disabled={loading}>
                {loading ? '...' : 'Créer'}
              </button>
            </form>

            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: lang === 'ar' ? 'right' : 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333', background: 'rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '0.75rem' }}>ID</th>
                    <th style={{ padding: '0.75rem' }}>Username</th>
                    <th style={{ padding: '0.75rem' }}>Statut</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.length === 0 ? (
                    <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: 'gray' }}>Aucun utilisateur ou accès refusé.</td></tr>
                  ) : usersList.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '0.75rem', color: 'gray' }}>#{u.id}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                        {editingUser?.id === u.id ? (
                          <input 
                            type="text" 
                            className="form-input" 
                            value={editingUser.username} 
                            onChange={e => setEditingUser({...editingUser, username: e.target.value})}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
                          />
                        ) : u.username}
                        {editingUser?.id === u.id && (
                          <input 
                            type="password" 
                            placeholder="New password" 
                            className="form-input" 
                            value={editingUser.password || ''} 
                            onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem', marginTop: '4px' }}
                          />
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {u.is_active ? (
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14} /> Actif</span>
                        ) : (
                          <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={14} /> Inactif</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          {editingUser?.id === u.id ? (
                            <>
                              <button onClick={handleUpdateUser} className="btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}>Sauver</button>
                              <button onClick={() => setEditingUser(null)} style={{ background: 'gray', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Annuler</button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => setEditingUser({...u, password: ''})} 
                                style={{ background: 'var(--gold-primary)', color: 'black', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                              >
                                Modifier
                              </button>
                              <button 
                                onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                                disabled={loading}
                                style={{ 
                                  background: u.is_active ? '#ef4444' : '#10b981', 
                                  color: 'white', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'
                                }}
                              >
                                {u.is_active ? 'Désactiver' : 'Activer'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="dashboard-view" style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '15px', borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'gray', marginBottom: '0.5rem' }}><Server size={18} /> Utilisateurs connectés</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{dashboardStats.activeConnections.length}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '15px', borderLeft: '4px solid #3b82f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'gray', marginBottom: '0.5rem' }}><Smartphone size={18} /> Apps Android</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{dashboardStats.installations.android}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '15px', borderLeft: '4px solid #f43f5e' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'gray', marginBottom: '0.5rem' }}><Smartphone size={18} /> Apps iOS</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{dashboardStats.installations.ios}</div>
              </div>
            </div>

            {/* DATABASE BACKUP SECTION */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '15px', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ margin: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gold-primary)' }}>
                <Server size={18} /> {lang === 'ar' ? 'نسخ احتياطي لقاعدة البيانات' : 'Sauvegarde & Téléchargement'}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.2rem', lineHeight: '1.5' }}>
                {lang === 'ar' 
                  ? 'يمكنك إنشاء نسخة احتياطية من قاعدة البيانات على خادم Railway (في المسار /app/data/database.sqlite) أو تحميل نسخة مباشرة إلى جهازك.' 
                  : 'Vous pouvez créer une sauvegarde locale de la base de données sur le serveur Railway (sous /app/data/database.sqlite) ou télécharger directement le fichier SQLite actif.'}
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  onClick={handleBackup} 
                  className="btn-primary" 
                  disabled={loading} 
                  style={{ width: 'auto', padding: '0.6rem 1.5rem' }}
                >
                  {loading ? '...' : (lang === 'ar' ? 'إنشاء نسخة احتياطية في Railway' : 'Créer sauvegarde Railway')}
                </button>
                <a 
                  href={`${SERVER_URL}/api/backup/download?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary" 
                  style={{ 
                    width: 'auto', 
                    padding: '0.6rem 1.5rem', 
                    background: 'var(--text-muted)', 
                    color: 'white', 
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                  onClick={(e) => {
                    if (!username || !password) {
                      e.preventDefault();
                      setStatus({ type: 'error', message: 'Entrez vos identifiants pour télécharger la sauvegarde.' });
                    }
                  }}
                >
                  {lang === 'ar' ? 'تحميل قاعدة البيانات' : 'Télécharger (.sqlite)'}
                </a>
              </div>
            </div>

            {/* DASHBOARD GRAPHS */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '15px', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart size={20} color="var(--gold-primary)" /> {lang === 'ar' ? 'إحصائيات الاتصال' : 'Statistiques de connexion'}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px' }}>
                  {['hourly', 'daily', 'weekly', 'monthly'].map(p => (
                    <button 
                      key={p}
                      onClick={() => setStatsPeriod(p)}
                      style={{ 
                        padding: '0.3rem 0.8rem', 
                        borderRadius: '6px', 
                        border: 'none', 
                        background: statsPeriod === p ? 'var(--gold-primary)' : 'transparent',
                        color: statsPeriod === p ? 'black' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={connStats[statsPeriod]}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--gold-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--gold-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      stroke="rgba(255,255,255,0.4)" 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.4)" 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
                      itemStyle={{ color: 'var(--gold-primary)' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="var(--gold-primary)" 
                      fillOpacity={1} 
                      fill="url(#colorCount)" 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Connexions Actives (WebSockets)</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button 
                  onClick={() => setConnPage(p => Math.max(1, p - 1))}
                  disabled={connPage === 1}
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '4px', borderRadius: '4px', cursor: 'pointer', opacity: connPage === 1 ? 0.3 : 1 }}
                >
                  <ChevronLeft size={18} />
                </button>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Page {connPage}</span>
                <button 
                  onClick={() => setConnPage(p => p + 1)}
                  disabled={connPage * connPerPage >= dashboardStats.activeConnections.length}
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '4px', borderRadius: '4px', cursor: 'pointer', opacity: connPage * connPerPage >= dashboardStats.activeConnections.length ? 0.3 : 1 }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', overflow: 'hidden', marginBottom: '2rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333', background: 'rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '0.75rem', textAlign: lang === 'ar' ? 'right' : 'left' }}>IP</th>
                    <th style={{ padding: '0.75rem', textAlign: lang === 'ar' ? 'right' : 'left' }}>App</th>
                    <th style={{ padding: '0.75rem', textAlign: lang === 'ar' ? 'right' : 'left' }}>Heure de connexion</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardStats.activeConnections.length === 0 ? (
                    <tr><td colSpan="3" style={{ padding: '1rem', textAlign: 'center', color: 'gray' }}>Aucune connexion active</td></tr>
                  ) : dashboardStats.activeConnections.slice((connPage - 1) * connPerPage, connPage * connPerPage).map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '0.75rem' }}>{c.ip}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ 
                          background: c.platform === 'ios' ? '#f43f5e' : '#3b82f6', 
                          color: 'white', 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          textTransform: 'uppercase'
                        }}>
                          {c.platform || 'web'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{new Date(c.connectedAt).toLocaleString('fr-FR', { timeZone: 'Africa/Casablanca' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Journal des Connexions (Sécurité)</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button 
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '4px', borderRadius: '4px', cursor: 'pointer', opacity: historyPage === 1 ? 0.3 : 1 }}
                >
                  <ChevronLeft size={18} />
                </button>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Page {historyPage}</span>
                <button 
                  onClick={() => setHistoryPage(p => p + 1)}
                  disabled={historyPage * historyPerPage >= (dashboardStats.connectionHistory?.length || 0)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '4px', borderRadius: '4px', cursor: 'pointer', opacity: historyPage * historyPerPage >= (dashboardStats.connectionHistory?.length || 0) ? 0.3 : 1 }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', overflow: 'hidden', marginBottom: '2rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333', background: 'rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '0.75rem', textAlign: lang === 'ar' ? 'right' : 'left' }}>IP</th>
                    <th style={{ padding: '0.75rem', textAlign: lang === 'ar' ? 'right' : 'left' }}>Date & Heure</th>
                  </tr>
                </thead>
                <tbody>
                  {!dashboardStats.connectionHistory || dashboardStats.connectionHistory.length === 0 ? (
                    <tr><td colSpan="2" style={{ padding: '1rem', textAlign: 'center', color: 'gray' }}>Aucun log disponible</td></tr>
                  ) : dashboardStats.connectionHistory.slice((historyPage - 1) * historyPerPage, historyPage * historyPerPage).map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '0.75rem' }}>{h.ip_address}</td>
                      <td style={{ padding: '0.75rem' }}>{new Date(h.connected_at).toLocaleString('fr-FR', { timeZone: 'Africa/Casablanca' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {status.message && (
          <div className={`status-message status-${status.type}`}>
            {status.message}
          </div>
        )}
        {lastUpdated && (
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              🕒 {lang === 'ar' ? 'آخر تحديث' : lang === 'en' ? 'Last update' : lang === 'es' ? 'Última actualización' : 'Dernière mise à jour'}
            </div>
            <div style={{ color: '#60a5fa', fontSize: '1rem', fontWeight: '500', marginTop: '0.2rem' }}>
              {parseDate(lastUpdated)?.toLocaleDateString(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Africa/Casablanca'
              })}
            </div>
            <div style={{ color: '#fbbf24', fontSize: '1.4rem', fontWeight: '900', marginTop: '0.1rem', letterSpacing: '1px' }}>
              {parseDate(lastUpdated)?.toLocaleTimeString(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'Africa/Casablanca'
              })}
            </div>
          </div>
        )}
      </div>

      <footer className="global-footer">
        copyright &copy; 2026; <a href="https://sdbo.ma" target="_blank" rel="noreferrer">sdbo.ma</a>
      </footer>
    </div>
  );
}
