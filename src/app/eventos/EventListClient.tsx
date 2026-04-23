'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Wine } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Event {
  id: string;
  type: string;
  date: Date;
  ageRange: string;
  drinksAvailable: string;
  spotsPerGender: number;
  mpEnabled: boolean;
  price: number;
  registrations?: any[];
}

export default function EventListClient({ events }: { events: Event[] }) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [mounted, setMounted] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  useEffect(() => { 
    setMounted(true); 
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pago = params.get('pago');
      const paymentId = params.get('payment_id');
      
      if (pago === 'exitoso' && paymentId) {
        fetch(`/api/checkout/verify?payment_id=${paymentId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setPaymentStatus('exitoso');
              setTimeout(() => setPaymentStatus(null), 8000);
            } else {
              setPaymentStatus('fallo');
              setTimeout(() => setPaymentStatus(null), 8000);
            }
          })
          .catch(() => {
            setPaymentStatus('fallo');
            setTimeout(() => setPaymentStatus(null), 8000);
          });
      } else if (pago) {
        setPaymentStatus(pago);
        setTimeout(() => setPaymentStatus(null), 8000);
      }

      // Limpiar URL para que no reaparezca al refrescar
      if (pago) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  if (!mounted) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
        <p>Cargando eventos...</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid-3">
        {(() => {
          const processedEvents = events.map(event => {
            const isHH = event.type === 'Ellos y Ellos';
            const isMM = event.type === 'Ellas y Ellas';
            const totalCapacityMen = isHH ? event.spotsPerGender * 2 : event.spotsPerGender;
            const totalCapacityWomen = isMM ? event.spotsPerGender * 2 : event.spotsPerGender;
            const registeredMen = event.registrations?.filter(r => r.gender === 'Hombre').length || 0;
            const registeredWomen = event.registrations?.filter(r => r.gender === 'Mujer').length || 0;
            const availableMen = Math.max(0, totalCapacityMen - registeredMen);
            const availableWomen = Math.max(0, totalCapacityWomen - registeredWomen);
            const isSoldOut = isHH ? availableMen === 0 : isMM ? availableWomen === 0 : (availableMen === 0 && availableWomen === 0);
            return { ...event, isSoldOut, isHH, isMM, availableMen, availableWomen };
          });

          const sortedEvents = processedEvents.sort((a, b) => {
            if (a.isSoldOut !== b.isSoldOut) return a.isSoldOut ? 1 : -1;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          });

          return sortedEvents.map((event) => {
            const { isSoldOut, isHH, isMM, availableMen, availableWomen } = event;

          return (
          <div key={event.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'inline-block', background: isSoldOut ? 'rgba(255, 16, 122, 0.1)' : 'rgba(57, 255, 20, 0.1)', padding: '0.25rem 0.75rem', borderRadius: '50px', marginBottom: '1.5rem', border: isSoldOut ? '1px solid rgba(255, 16, 122, 0.3)' : '1px solid rgba(57, 255, 20, 0.3)' }}>
                <span className={isSoldOut ? "text-pink" : "text-green"} style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {isSoldOut ? "Agotado" : "Abierto"}
                </span>
              </div>
              <h4 style={{ fontSize: '2rem', marginBottom: '1.5rem', textTransform: 'uppercase', lineHeight: 1.1 }}>
                {event.type}
              </h4>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                <Calendar size={20} className="text-pink" />
                <span suppressHydrationWarning style={{ fontSize: '1.1rem' }}>{format(new Date(event.date), "EEEE d 'de' MMMM", { locale: es })}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                <Clock size={20} className="text-pink" />
                <span suppressHydrationWarning style={{ fontSize: '1.1rem' }}>{format(new Date(event.date), "HH:mm")} hs</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                <Users size={20} className="text-pink" />
                <span style={{ fontSize: '1.1rem' }}>Rango: {event.ageRange}</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {!isMM && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{isHH ? 'Cupos Totales:' : 'Cupos Hombres:'}</span>
                    {availableMen > 0 ? (
                      <span className="text-green" style={{ fontWeight: 600 }}>{availableMen} disp.</span>
                    ) : (
                      <span className="text-pink" style={{ fontWeight: 600 }}>Agotado</span>
                    )}
                  </div>
                )}
                {!isHH && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{isMM ? 'Cupos Totales:' : 'Cupos Mujeres:'}</span>
                    {availableWomen > 0 ? (
                      <span className="text-green" style={{ fontWeight: 600 }}>{availableWomen} disp.</span>
                    ) : (
                      <span className="text-pink" style={{ fontWeight: 600 }}>Agotado</span>
                    )}
                  </div>
                )}
              </div>

            </div>
            
            {isSoldOut ? (
              <button className="btn" style={{ width: '100%', marginTop: '1rem', background: 'rgba(255,255,255,0.1)', cursor: 'not-allowed', color: 'gray' }} disabled>
                Evento Agotado
              </button>
            ) : (
              <button className="btn btn-outline" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setSelectedEvent(event)}>
                Anotarse al Evento
              </button>
            )}
          </div>
          );
        });
        })()}
      </div>

      {selectedEvent && (
        <RegistrationModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}

      {/* --- MENSJES DE PAGO --- */}
      {paymentStatus === 'exitoso' && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: 'rgba(57,255,20,0.15)', border: '1px solid var(--neon-green)', padding: '1.5rem', borderRadius: '12px', zIndex: 1000, backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <h4 style={{ color: 'var(--neon-green)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>✅ ¡Pago Confirmado!</h4>
          <p style={{ color: 'white', fontSize: '0.9rem', marginBottom: '1rem' }}>Tu lugar está asegurado. ¡Nos vemos en el evento!</p>
          <button onClick={() => setPaymentStatus(null)} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', width: '100%' }}>Cerrar</button>
        </div>
      )}
      {paymentStatus === 'fallo' && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: 'rgba(255,16,122,0.15)', border: '1px solid var(--neon-pink)', padding: '1.5rem', borderRadius: '12px', zIndex: 1000, backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <h4 style={{ color: 'var(--neon-pink)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>❌ Error en el Pago</h4>
          <p style={{ color: 'white', fontSize: '0.9rem', marginBottom: '1rem' }}>No se pudo procesar tu pago. Por favor intenta de nuevo.</p>
          <button onClick={() => setPaymentStatus(null)} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', width: '100%', borderColor: 'var(--neon-pink)', color: 'var(--neon-pink)' }}>Cerrar</button>
        </div>
      )}
    </>
  );
}

function RegistrationModal({ event, onClose }: { event: Event, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<'mercadopago' | 'transfer' | false>(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mercadopago' | 'transfer'>(event.mpEnabled ? 'mercadopago' : 'transfer');

  const drinks = event.drinksAvailable.split(',').map(d => d.trim()).filter(Boolean);

  const isHH = event.type === 'Ellos y Ellos';
  const isMM = event.type === 'Ellas y Ellas';
  const totalCapacityMen = isHH ? event.spotsPerGender * 2 : event.spotsPerGender;
  const totalCapacityWomen = isMM ? event.spotsPerGender * 2 : event.spotsPerGender;

  const registeredMen = event.registrations?.filter(r => r.gender === 'Hombre').length || 0;
  const registeredWomen = event.registrations?.filter(r => r.gender === 'Mujer').length || 0;
  
  const availableMen = Math.max(0, totalCapacityMen - registeredMen);
  const availableWomen = Math.max(0, totalCapacityWomen - registeredWomen);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const phone = formData.get('phone');

    if (!email && !phone) {
      setError('Por favor ingresá un Email o un Celular para poder contactarte.');
      setLoading(false);
      return;
    }

    const data = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: email || null,
      phone: phone || null,
      gender: formData.get('gender'),
      selectedDrink: formData.get('selectedDrink'),
      eventId: event.id,
      paymentMethod
    };

    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const resData = await res.json();

      if (!res.ok) throw new Error(resData.error || 'Ocurrió un error en el servidor. Intenta nuevamente.');
      
      if (resData.paymentMethod === 'transfer') {
        setSuccess('transfer');
      } else if (resData.init_point) {
        setSuccess('mercadopago');
        // Redirigir a Mercado Pago
        window.location.href = resData.init_point;
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      <div className="glass-card" style={{ 
        width: '100%', maxWidth: '500px', position: 'relative',
        border: '1px solid rgba(255, 16, 122, 0.4)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 16, 122, 0.15)'
      }}>
        <button onClick={() => {
          onClose();
          if (success) {
            window.location.reload();
          }
        }} style={{ 
          position: 'absolute', top: '1.5rem', right: '1.5rem', 
          background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '2rem', cursor: 'pointer',
          lineHeight: 0.5
        }}>
          &times;
        </button>
        
        <h3 className="text-pink" style={{ fontSize: '2.5rem', marginBottom: '0.1rem' }}>Registro</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {event.type} <span style={{color: 'var(--neon-green)'}}>•</span> <span suppressHydrationWarning>{format(new Date(event.date), "dd/MM/yyyy")}</span>
        </p>

        {success === 'mercadopago' ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(57,255,20,0.1)', color: 'var(--neon-green)', marginBottom: '1.5rem' }}>
              <Wine size={40} />
            </div>
            <h4 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'white' }}>¡Redirigiendo a Mercado Pago!</h4>
            <p style={{ color: 'var(--text-muted)' }}>Deberías ser enviado al Checkout en unos segundos.</p>
          </div>
        ) : success === 'transfer' ? (
          <div style={{ padding: '1rem 0' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(57,255,20,0.1)', color: 'var(--neon-green)', marginBottom: '1rem' }}>
                <span style={{ fontSize: '24px' }}>📅</span>
              </div>
              <h4 style={{ fontSize: '1.6rem', marginBottom: '0.5rem', color: 'white' }}>¡Registro Iniciado!</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Para confirmar tu lugar, realizá la transferencia y envianos el comprobante.</p>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              <p style={{ color: 'var(--neon-green)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Datos para Transferencia (${event.price || 850} UYU)</p>
              
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ color: 'white' }}>Mariana Ganimian</strong><br/>
                <span style={{ color: 'var(--text-muted)' }}>Dentro de Santander:</span> Cuenta 1201993896 / Suc. 19-Carrasco<br/>
                <span style={{ color: 'var(--text-muted)' }}>Otros bancos a Santander:</span> Cuenta 0019001201993896 (UYU)
              </div>
              
              <div>
                <strong style={{ color: 'white' }}>Prex Kerop</strong><br/>
                <span style={{ color: 'var(--text-muted)' }}>Mariana Ganimian (CI 45342774)</span><br/>
                <span style={{ color: 'var(--text-muted)' }}>Cuenta:</span> 290962
              </div>
            </div>
            
            <button onClick={() => {
              onClose();
              if (success) window.location.reload();
            }} className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>
              Aceptar y Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <label className="input-label">Nombre</label>
                <input type="text" name="firstName" required className="input-field" placeholder="Juan" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="input-label">Apellido</label>
                <input type="text" name="lastName" required className="input-field" placeholder="Pérez" />
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textAlign: 'center' }}>
              Completá al menos un medio de contacto para enviarte los detalles.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className="input-label">Email</label>
                <input type="email" name="email" className="input-field" placeholder="tu@email.com" />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className="input-label">Celular (WhatsApp)</label>
                <input type="tel" name="phone" className="input-field" placeholder="+598 9X XXX XXX" defaultValue="+598" />
              </div>
            </div>

            {event.type === 'Ellas y Ellas' ? (
              <input type="hidden" name="gender" value="Mujer" />
            ) : event.type === 'Ellos y Ellos' ? (
              <input type="hidden" name="gender" value="Hombre" />
            ) : (
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="input-label">Género</label>
                <select name="gender" required defaultValue="" className="input-field" style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', paddingRight: '3rem' }}>
                  <option value="" disabled>Seleccioná tu género...</option>
                  <option value="Mujer" style={{ background: '#000', color: availableWomen === 0 ? 'gray' : '#fff' }} disabled={availableWomen === 0}>Mujer {availableWomen === 0 ? '(AGOTADO)' : ''}</option>
                  <option value="Hombre" style={{ background: '#000', color: availableMen === 0 ? 'gray' : '#fff' }} disabled={availableMen === 0}>Hombre {availableMen === 0 ? '(AGOTADO)' : ''}</option>
                </select>
              </div>
            )}
            
            <div style={{ marginBottom: '2rem' }}>
              <label className="input-label">Elegí tu Trago de Autor</label>
              <select name="selectedDrink" required defaultValue="" className="input-field" style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', paddingRight: '3rem' }}>
                <option value="" disabled>Seleccioná una opción...</option>
                {drinks.map(drink => (
                  <option key={drink} value={drink} style={{ background: '#000', color: '#fff' }}>{drink}</option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <label className="input-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Forma de Pago</label>
              
              <div style={{ display: 'grid', gridTemplateColumns: event.mpEnabled ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                {event.mpEnabled && (
                  <div 
                    onClick={() => setPaymentMethod('mercadopago')}
                    style={{ 
                      border: `1px solid ${paymentMethod === 'mercadopago' ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)'}`, 
                      background: paymentMethod === 'mercadopago' ? 'rgba(0, 255, 255, 0.1)' : 'rgba(0,0,0,0.3)',
                      padding: '1rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💳</div>
                    <div style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>Mercado Pago</div>
                    <div style={{ color: 'var(--neon-cyan)', fontSize: '0.85rem', marginTop: '0.2rem' }}>${event.price || 850} UYU</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.2rem' }}>Tarjetas o Dinero MP</div>
                  </div>
                )}


                <div 
                  onClick={() => setPaymentMethod('transfer')}
                  style={{ 
                    border: `1px solid ${paymentMethod === 'transfer' ? 'var(--neon-green)' : 'rgba(255,255,255,0.1)'}`, 
                    background: paymentMethod === 'transfer' ? 'rgba(57,255,20,0.1)' : 'rgba(0,0,0,0.3)',
                    padding: '1rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏦</div>
                  <div style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>Transferencia</div>
                  <div style={{ color: 'var(--neon-green)', fontSize: '0.85rem', marginTop: '0.2rem' }}>${event.price || 850} UYU</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.2rem' }}>Transferencia directa</div>
                </div>
              </div>
            </div>
            
            {error && <p className="text-pink" style={{ marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>}
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '1.1rem' }} disabled={loading}>
              {loading ? 'Procesando...' : paymentMethod === 'mercadopago' ? `Ir a MercadoPago ($${event.price || 850})` : 'Ver datos para transferir'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
