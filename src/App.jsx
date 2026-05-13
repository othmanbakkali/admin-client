import { useState, useEffect } from 'react';
import { Save, Lock, ArrowLeft, AreaChart as ChartIcon, User, Users, UserPlus, CheckCircle, XCircle, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  const [newUser, setNewUser] = useState({ username: '', password: '', isActive: true });
  const [editingUser, setEditingUser] = useState(null); // { id, username, password, isActive }
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
        </div>

        {activeTab === 'price' ? (
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
        ) : (
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
        )}

        {status.message && (
          <div className={`status-message status-${status.type}`}>
            {status.message}
          </div>
        )}
        {lastUpdated && (
          <div style={{ marginTop: '1rem', color: 'gray', fontSize: '0.9rem' }}>
            🕒 {lang === 'ar' ? 'آخر تحديث' : lang === 'en' ? 'Last update' : lang === 'es' ? 'Última actualización' : 'Dernière mise à jour'} : {parseDate(lastUpdated)?.toLocaleString(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        )}
      </div>

      <footer className="global-footer">
        copyright &copy; 2026; <a href="https://sdbo.ma" target="_blank" rel="noreferrer">sdbo.ma</a>
      </footer>
    </div>
  );
}
