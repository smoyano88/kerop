'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/* ── Tragos reales del menú de Kerop ── */
const DRINKS_SIN_ALCOHOL = [
  'Jugo de naranja exprimido',
  'Limonada con menta y jengibre',
  'Monster (Mango Loco)',
  'Coca Cola 600ml',
  'Coca Cola Sin azúcar 600ml',
];

const DRINKS_ALCOHOLICAS = [
  'Cerveza lata 473ml',
  'Cerveza Kotayk o Erebuni 500ml',
  'Vermouth rosso de Rooster',
  'Campari con naranja',
  'Vodka con naranja',
  'Ron con Coca',
  'Fernet con Coca',
  'Sidra Matriarca 330ml',
  'Medio y medio en lata 473ml',
  'GinTonic clásico',
];

interface Registration {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  selectedDrink: string;
  paid: boolean;
  paymentMethod?: string;
}

interface Event {
  id: string;
  type: string;
  date: Date;
  ageRange: string;
  drinksAvailable: string;
  spotsPerGender: number;
  mpEnabled: boolean;
  registrations: Registration[];
}

export default function AdminClient({ events }: { events: Event[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [eventList, setEventList] = useState<Event[]>(events);

  const reloadEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      setEventList(data);
    } catch (e) {
      console.error('Error recargando eventos:', e);
    }
  };

  /* ── Auth State: login una sola vez ── */
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  /* ── Drink Tag State ── */
  const [selectedDrinks, setSelectedDrinks] = useState<string[]>([
    ...DRINKS_ALCOHOLICAS.slice(0, 5),
  ]);
  const [customDrink, setCustomDrink] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword === 'Kerop2024') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Contraseña incorrecta');
    }
  };

  // Show success message temporarily
  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 5000);
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('¿Estás seguro de que querés eliminar este evento? Se borrarán también todos los inscriptos.')) return;

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'Kerop2024' })
      });
      if (!res.ok) throw new Error('Error al eliminar evento');
      
      showSuccess('✅ Evento eliminado correctamente.');
      await reloadEvents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteRegistration = async (regId: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que querés eliminar a ${name}?`)) return;

    try {
      const res = await fetch(`/api/registrations/${regId}?pwd=Kerop2024`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Error al eliminar inscripción');
      
      showSuccess('✅ Inscripción eliminada.');
      await reloadEvents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMarkAsPaid = async (regId: string, name: string) => {
    if (!window.confirm(`¿Confirmar que ${name} realizó la transferencia y marcar como pagado?`)) return;

    try {
      const res = await fetch(`/api/registrations/${regId}?pwd=Kerop2024`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Error al actualizar pago');
      
      showSuccess('✅ Pago confirmado correctamente.');
      await reloadEvents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleDrink = (drink: string) => {
    setSelectedDrinks(prev =>
      prev.includes(drink) ? prev.filter(d => d !== drink) : [...prev, drink]
    );
  };

  const addCustomDrink = () => {
    const trimmed = customDrink.trim();
    if (trimmed && !selectedDrinks.includes(trimmed)) {
      setSelectedDrinks(prev => [...prev, trimmed]);
      setCustomDrink('');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (selectedDrinks.length === 0) {
      setError('Seleccioná al menos un trago para el evento.');
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const data = {
      type: formData.get('type'),
      date: formData.get('date'),
      time: formData.get('time'),
      ageRange: formData.get('ageRange'),
      spotsPerGender: formData.get('spotsPerGender'),
      mpEnabled: formData.get('mpEnabled') === 'on',
      drinksAvailable: selectedDrinks.join(', '),
      password: 'Kerop2024',
    };

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al crear evento');
      }

      showSuccess('✅ Evento creado correctamente.');
      (e.target as HTMLFormElement).reset();
      await reloadEvents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Pantalla de Login ── */
  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '400px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="glass-card" style={{ border: '1px solid rgba(255,16,122,0.2)', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
          <h3 className="text-pink" style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Panel de Administración</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Ingresá la contraseña para acceder.</p>
          {loginError && (
            <div style={{ backgroundColor: 'rgba(255, 16, 122, 0.1)', border: '1px solid rgba(255,16,122,0.3)', color: 'var(--neon-pink)', padding: '0.75rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {loginError}
            </div>
          )}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="input-field"
              placeholder="Contraseña de Admin"
              autoFocus
              required
            />
            <button type="submit" className="btn btn-primary">Ingresar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-grid">

      {/* ─── Formulario Crear Evento ─── */}
      <div className="glass-card admin-form" style={{ border: '1px solid rgba(255,16,122,0.2)' }}>
        <h3 className="text-pink" style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Nuevo Evento</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Completá los datos para publicar una fecha de Speed Dating.</p>

        {success && (
          <div style={{ backgroundColor: 'rgba(57, 255, 20, 0.1)', border: '1px solid rgba(57,255,20,0.3)', color: 'var(--neon-green)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {success}
          </div>
        )}
        {error && (
          <div style={{ backgroundColor: 'rgba(255, 16, 122, 0.1)', border: '1px solid rgba(255,16,122,0.3)', color: 'var(--neon-pink)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="input-label">Categoría del Evento</label>
            <select name="type" required defaultValue="" className="input-field">
              <option value="" disabled>Seleccioná categoría...</option>
              <option value="Ellos y Ellas">Ellos y Ellas (H/M)</option>
              <option value="Ellas y Ellas">Ellas y Ellas (M/M)</option>
              <option value="Ellos y Ellos">Ellos y Ellos (H/H)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="input-label">Fecha</label>
              <input type="date" name="date" required className="input-field" />
            </div>
            <div>
              <label className="input-label">Hora</label>
              <input type="time" name="time" required className="input-field" defaultValue="20:00" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="input-label">Rango Etario</label>
              <input type="text" name="ageRange" required className="input-field" placeholder="Ej: 25 a 35 años" />
            </div>
            <div>
              <label className="input-label">Cupos por Género</label>
              <input type="number" name="spotsPerGender" required className="input-field" defaultValue="8" min="1" max="100" />
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Métodos de Pago</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <input type="checkbox" name="mpEnabled" id="mpEnabled" defaultChecked style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--neon-cyan)' }} />
              <label htmlFor="mpEnabled" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer' }}>
                Habilitar pagos online (Mercado Pago)
              </label>
            </div>
            <p style={{ color: 'gray', fontSize: '0.75rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
              Transferencia bancaria directa siempre estará habilitado como método de pago.
            </p>
          </div>

          {/* ── Drink Tag Selector ── */}
          <div>
            <label className="input-label">Tragos del evento ({selectedDrinks.length} seleccionados)</label>

            {/* Sin alcohol */}
            <p style={{ color: 'var(--neon-cyan)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', margin: '0.75rem 0 0.5rem', fontWeight: 600 }}>Sin Alcohol</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {DRINKS_SIN_ALCOHOL.map(drink => {
                const active = selectedDrinks.includes(drink);
                return (
                  <button
                    key={drink}
                    type="button"
                    onClick={() => toggleDrink(drink)}
                    style={{
                      padding: '0.35rem 0.7rem',
                      borderRadius: '50px',
                      border: `1px solid ${active ? 'rgba(57,255,20,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      background: active ? 'rgba(57,255,20,0.15)' : 'rgba(0,0,0,0.3)',
                      color: active ? 'var(--neon-green)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    {active ? '✓ ' : ''}{drink}
                  </button>
                );
              })}
            </div>

            {/* Alcohólicas */}
            <p style={{ color: 'var(--neon-pink)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', margin: '0.75rem 0 0.5rem', fontWeight: 600 }}>Alcohólicas</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {DRINKS_ALCOHOLICAS.map(drink => {
                const active = selectedDrinks.includes(drink);
                return (
                  <button
                    key={drink}
                    type="button"
                    onClick={() => toggleDrink(drink)}
                    style={{
                      padding: '0.35rem 0.7rem',
                      borderRadius: '50px',
                      border: `1px solid ${active ? 'rgba(255,16,122,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      background: active ? 'rgba(255,16,122,0.15)' : 'rgba(0,0,0,0.3)',
                      color: active ? 'var(--neon-pink)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    {active ? '✓ ' : ''}{drink}
                  </button>
                );
              })}
            </div>

            {/* Custom drinks added */}
            {selectedDrinks.filter(d => !DRINKS_SIN_ALCOHOL.includes(d) && !DRINKS_ALCOHOLICAS.includes(d)).length > 0 && (
              <>
                <p style={{ color: 'var(--chalk-yellow)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', margin: '0.75rem 0 0.5rem', fontWeight: 600 }}>Personalizados</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {selectedDrinks.filter(d => !DRINKS_SIN_ALCOHOL.includes(d) && !DRINKS_ALCOHOLICAS.includes(d)).map(drink => (
                    <button
                      key={drink}
                      type="button"
                      onClick={() => toggleDrink(drink)}
                      style={{
                        padding: '0.35rem 0.7rem',
                        borderRadius: '50px',
                        border: '1px solid rgba(245,242,66,0.5)',
                        background: 'rgba(245,242,66,0.15)',
                        color: 'var(--chalk-yellow)',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                      }}
                    >
                      ✓ {drink} ✕
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Add custom */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <input
                type="text"
                value={customDrink}
                onChange={(e) => setCustomDrink(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomDrink(); } }}
                className="input-field"
                placeholder="Agregar trago personalizado..."
                style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
              />
              <button
                type="button"
                onClick={addCustomDrink}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap',
                }}
              >
                + Agregar
              </button>
            </div>
          </div>



          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Creando evento...' : '+ Publicar Evento'}
          </button>
        </form>
      </div>

      {/* ─── Lista de Eventos ─── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.4rem' }}>Eventos Publicados</h3>
          <span style={{
            background: 'rgba(57,255,20,0.15)',
            color: 'var(--neon-green)',
            border: '1px solid rgba(57,255,20,0.3)',
            borderRadius: '50px',
            padding: '0.2rem 0.75rem',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>{eventList.length}</span>
          <button
            onClick={() => reloadEvents()}
            style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-muted)', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}
            title="Actualizar lista"
          >
            🔄 Actualizar
          </button>
        </div>

        {eventList.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
            <p>No hay eventos creados aún. Cargá el primero con el formulario.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {eventList.map((ev) => {
              const total = (ev.registrations || []).length;
              const isExpanded = expandedEvent === ev.id;
              const drinksList = (ev.drinksAvailable || '').split(',').map(d => d.trim()).filter(Boolean);
              
              const isHH = ev.type === 'Ellos y Ellos';
              const isMM = ev.type === 'Ellas y Ellas';
              const totalSpotsMen = isHH ? ev.spotsPerGender * 2 : ev.spotsPerGender;
              const totalSpotsWomen = isMM ? ev.spotsPerGender * 2 : ev.spotsPerGender;
              const registeredMen = ev.registrations.filter(r => r.gender === 'Hombre').length;
              const registeredWomen = ev.registrations.filter(r => r.gender === 'Mujer').length;
              const paidMen = ev.registrations.filter(r => r.paid && r.gender === 'Hombre').length;
              const paidWomen = ev.registrations.filter(r => r.paid && r.gender === 'Mujer').length;
              return (
                <div key={ev.id} className="glass-card" style={{ padding: '1.5rem', position: 'relative' }}>
                  <button 
                    onClick={() => handleDeleteEvent(ev.id)}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,16,122,0.1)', border: '1px solid rgba(255,16,122,0.3)', color: 'var(--neon-pink)', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Eliminar
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', paddingRight: '4rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1.3rem', marginBottom: '0.3rem' }}>{ev.type}</h4>
                      <p style={{ color: 'var(--neon-cyan)', fontSize: '0.95rem' }}>
                        {format(new Date(ev.date), "EEEE d 'de' MMMM yyyy 'a las' HH:mm 'hs'", { locale: es })}
                      </p>
                    </div>
                  </div>

                  {/* Métricas estructuradas */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Rango Etario</div>
                      <div style={{ fontWeight: 600, color: 'white' }}>{ev.ageRange}</div>
                    </div>
                    
                    {!isMM && (
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{isHH ? 'Cupos Totales' : 'Cupos Hombres'}</div>
                        <div style={{ fontWeight: 600, color: 'var(--neon-green)' }}>{Math.max(0, totalSpotsMen - paidMen)} disp. <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(de {totalSpotsMen})</span></div>
                        <div style={{ fontSize: '0.75rem', color: 'gray', marginTop: '0.2rem' }}>Pagos: {paidMen} · Pendientes: {registeredMen - paidMen}</div>
                      </div>
                    )}

                    {!isHH && (
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{isMM ? 'Cupos Totales' : 'Cupos Mujeres'}</div>
                        <div style={{ fontWeight: 600, color: 'var(--neon-green)' }}>{Math.max(0, totalSpotsWomen - paidWomen)} disp. <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(de {totalSpotsWomen})</span></div>
                        <div style={{ fontSize: '0.75rem', color: 'gray', marginTop: '0.2rem' }}>Pagos: {paidWomen} · Pendientes: {registeredWomen - paidWomen}</div>
                      </div>
                    )}
                  </div>

                  {/* Drink tags display */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginRight: '0.25rem', alignSelf: 'center' }}>🍹</span>
                    {drinksList.map((drink, idx) => (
                      <span key={idx} style={{
                        background: 'rgba(255,16,122,0.1)',
                        color: 'var(--neon-pink)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '50px',
                        fontSize: '0.75rem',
                        border: '1px solid rgba(255,16,122,0.2)',
                      }}>
                        {drink}
                      </span>
                    ))}
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <span style={{
                      background: ev.mpEnabled ? 'rgba(0,255,255,0.1)' : 'rgba(255,16,122,0.1)',
                      color: ev.mpEnabled ? 'var(--neon-cyan)' : 'var(--neon-pink)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      border: `1px solid ${ev.mpEnabled ? 'rgba(0,255,255,0.2)' : 'rgba(255,16,122,0.2)'}`,
                    }}>
                      {ev.mpEnabled ? '💳 Mercado Pago Habilitado' : '🚫 Solo Transferencias'}
                    </span>
                  </div>

                  {total > 0 && (
                    <>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: isExpanded ? '1rem' : 0 }}>
                        <button
                          onClick={() => setExpandedEvent(isExpanded ? null : ev.id)}
                          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.3s' }}
                        >
                          {isExpanded ? '▲ Ocultar inscriptos' : `▼ Ver ${total} inscripto${total !== 1 ? 's' : ''}`}
                        </button>
                        
                        <a 
                          href={`/admin/planilla/${ev.id}`} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#fde047', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'none', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <span>🖨️</span> Descargar Planilla
                        </a>
                      </div>

                      {isExpanded && (
                        <div style={{ width: '100%', maxWidth: 'calc(100vw - 3rem)', borderRadius: '10px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <table style={{ minWidth: '700px', width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                              <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>#</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Nombre</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Género</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Pago</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Trago</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Registrado</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ev.registrations.map((reg, idx) => (
                                <tr key={reg.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{reg.firstName} {reg.lastName}</td>
                                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap', minWidth: '110px' }}>{reg.gender === 'Hombre' ? '👨 Hombre' : '👩 Mujer'}</td>
                                  <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', minWidth: '80px' }}>
                                    {reg.paid ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                        <span style={{ background: 'rgba(57,255,20,0.1)', color: 'var(--neon-green)', padding: '0.15rem 0.5rem', borderRadius: '50px', fontSize: '0.8rem', border: '1px solid rgba(57,255,20,0.2)', display: 'inline-block', textAlign: 'center' }}>
                                          ✅ Sí
                                        </span>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-start' }}>
                                        <span style={{ background: 'rgba(255,16,122,0.1)', color: 'var(--neon-pink)', padding: '0.15rem 0.5rem', borderRadius: '50px', fontSize: '0.8rem', border: '1px solid rgba(255,16,122,0.2)', display: 'inline-block', textAlign: 'center' }}>
                                          ❌ No
                                        </span>
                                        {reg.paymentMethod === 'transfer' && (
                                          <button 
                                            onClick={() => handleMarkAsPaid(reg.id, reg.firstName)}
                                            style={{ background: 'rgba(57,255,20,0.2)', color: 'var(--neon-green)', border: '1px solid rgba(57,255,20,0.4)', borderRadius: '4px', fontSize: '0.7rem', padding: '0.2rem 0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                            title="Confirmar transferencia"
                                          >
                                            💰 Marcar pagado
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem' }}>
                                    <span style={{ background: 'rgba(255,16,122,0.1)', color: 'var(--neon-pink)', padding: '0.2rem 0.7rem', borderRadius: '50px', fontSize: '0.8rem' }}>
                                      {reg.selectedDrink}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    {format(new Date(reg.createdAt), "dd/MM HH:mm")}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                    <button 
                                      onClick={() => handleDeleteRegistration(reg.id, `${reg.firstName} ${reg.lastName}`)}
                                      style={{ background: 'none', border: '1px solid rgba(255,16,122,0.3)', color: 'var(--neon-pink)', cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem 0.5rem', borderRadius: '6px' }}
                                      title="Eliminar inscripto"
                                    >
                                      🗑️
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
