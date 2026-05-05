'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Drink {
  id: string;
  name: string;
  isAlcoholic: boolean;
}

interface Registration {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  email?: string;
  phone?: string;
  instagram?: string;
  selectedDrink: string;
  eventId: string | null;
  archivedEventId: string | null;
  eventType: string | null;
  eventDate: string | null;
  paid: boolean;
  attended?: boolean;
  paymentMethod?: string;
  createdAt: string;
}

interface RegistrationWithEvent extends Registration {
  event: {
    id: string;
    type: string;
    date: string;
    ageRange: string;
  } | null;
}

interface ParticipantGroup {
  key: string;
  instagram: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  registrations: RegistrationWithEvent[];
}

interface Event {
  id: string;
  type: string;
  date: string;
  ageRange: string;
  drinksAvailable: string;
  spotsPerGender: number;
  mpEnabled: boolean;
  price: number;
  registrations: Registration[];
}

export default function AdminClient({ events }: { events: Event[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [eventList, setEventList] = useState<Event[]>(events);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'events' | 'create' | 'matches' | 'participants' | 'drinks' | 'tatuadores' | 'contenido' | 'password'>('events');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Tatuadores State
  interface TatuadorAdmin { id: string; name: string; specialty: string; bio: string; phone: string; instagram: string; photoUrl: string; order: number; active: boolean; contacts: { id: string; createdAt: string }[]; }
  const [tatuadoresList, setTatuadoresList] = useState<TatuadorAdmin[]>([]);
  const [tatuadoresLoading, setTatuadoresLoading] = useState(false);
  const [tatForm, setTatForm] = useState({ name: '', specialty: '', bio: '', phone: '', instagram: '', photoUrl: '', order: 0 });
  const [tatEditId, setTatEditId] = useState<string | null>(null);

  // Contenido State (horarios + carta)
  interface MenuItemAdmin { id: string; category: string; name: string; description: string; price: number; imageUrl: string; available: boolean; order: number; }
  const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
  type Dia = typeof DIAS[number];
  const DIA_LABELS: Record<Dia, string> = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };
  const [horarios, setHorarios] = useState<Record<Dia, { open: boolean; from: string; to: string }>>({
    lunes:    { open: true,  from: '', to: '' },
    martes:   { open: false, from: '', to: '' },
    miercoles:{ open: true,  from: '', to: '' },
    jueves:   { open: true,  from: '', to: '' },
    viernes:  { open: true,  from: '', to: '' },
    sabado:   { open: true,  from: '', to: '' },
    domingo:  { open: true,  from: '', to: '' },
  });
  const [horariosLoading, setHorariosLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItemAdmin[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuForm, setMenuForm] = useState({ category: 'cafe', name: '', description: '', price: '', imageUrl: '', order: 0 });
  const [menuEditId, setMenuEditId] = useState<string | null>(null);

  const loadContenido = async () => {
    setHorariosLoading(true);
    setMenuLoading(true);
    try {
      const [settingsRes, menuRes] = await Promise.all([
        fetch('/api/settings').then(r => r.json()),
        fetch('/api/menu-items').then(r => r.json()),
      ]);
      const newHorarios = { ...horarios };
      for (const dia of DIAS) {
        const raw: string = settingsRes[`horario_${dia}`] ?? '';
        if (!raw || raw === 'cerrado') {
          newHorarios[dia] = { open: false, from: '', to: '' };
        } else {
          // formato esperado: "9:00 – 22:00" o "9:00 - 22:00"
          const parts = raw.split(/\s*[–-]\s*/);
          newHorarios[dia] = { open: true, from: parts[0]?.trim() ?? '', to: parts[1]?.trim() ?? '' };
        }
      }
      setHorarios(newHorarios);
      setMenuItems(menuRes);
    } catch { /* silently fail */ } finally {
      setHorariosLoading(false);
      setMenuLoading(false);
    }
  };

  const handleSaveHorarios = async () => {
    setHorariosLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: currentAdminPassword,
          ...Object.fromEntries(DIAS.map(dia => [`horario_${dia}`, horarios[dia].open ? `${horarios[dia].from} – ${horarios[dia].to}` : 'cerrado'])),
        }),
      });
      setSuccess('Horarios actualizados');
    } catch { setError('Error guardando horarios'); } finally { setHorariosLoading(false); }
  };

  const handleSaveMenuItem = async () => {
    setMenuLoading(true);
    try {
      const method = menuEditId ? 'PUT' : 'POST';
      const body = menuEditId
        ? { password: currentAdminPassword, id: menuEditId, ...menuForm, price: Number(menuForm.price) }
        : { password: currentAdminPassword, ...menuForm, price: Number(menuForm.price) };
      await fetch('/api/menu-items', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setMenuForm({ category: 'cafe', name: '', description: '', price: '', imageUrl: '', order: 0 });
      setMenuEditId(null);
      await loadContenido();
      setSuccess(menuEditId ? 'Ítem actualizado' : 'Ítem agregado');
    } catch { setError('Error guardando ítem'); } finally { setMenuLoading(false); }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm('¿Eliminar este ítem?')) return;
    try {
      await fetch('/api/menu-items', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, password: currentAdminPassword }) });
      await loadContenido();
    } catch { setError('Error eliminando ítem'); }
  };

  // Participants State
  const [allRegistrations, setAllRegistrations] = useState<RegistrationWithEvent[]>([]);
  const [matchDataByEvent, setMatchDataByEvent] = useState<Record<string, { selections: Record<string, string[]> }>>({});
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsSearch, setParticipantsSearch] = useState('');
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);

  // Add-participant modal state
  const [addParticipantEventId, setAddParticipantEventId] = useState<string | null>(null);
  const [addPartForm, setAddPartForm] = useState({
    firstName: '', lastName: '', gender: 'Hombre' as 'Hombre' | 'Mujer',
    instagram: '', phone: '', email: '', selectedDrink: '', markAsPaid: true,
  });
  const [addPartLoading, setAddPartLoading] = useState(false);

  // Match State
  const [matchEventId, setMatchEventId] = useState<string | null>(null);
  const [matchSelections, setMatchSelections] = useState<Record<string, string[]>>({});
  const [matchResults, setMatchResults] = useState<any>(null);
  const [matchLoading, setMatchLoading] = useState(false);

  // Repeated match state: eventId -> { regId -> prior match partner info[] }
  const [repeatedMatchData, setRepeatedMatchData] = useState<Record<string, Record<string, { firstName: string; lastName: string; instagram: string | null }[]>>>({});

  // Global tooltip state
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const tooltipHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTooltip = (text: string, e: React.MouseEvent) => {
    if (tooltipHideTimer.current) clearTimeout(tooltipHideTimer.current);
    setTooltip({ text, x: e.clientX, y: e.clientY });
  };
  const hideTooltip = () => {
    tooltipHideTimer.current = setTimeout(() => setTooltip(null), 80);
  };

  const reloadEvents = async () => {
    try {
      const res = await fetch('/api/events?scope=admin');
      const data = await res.json();
      setEventList(data);
    } catch (e) {
      console.error('Error recargando eventos:', e);
    }
  };

  const loadParticipants = async () => {
    setParticipantsLoading(true);
    try {
      const regs: RegistrationWithEvent[] = await fetch('/api/registrations').then(r => r.json());
      setAllRegistrations(regs);

      // Usamos eventId vivo o archivado para no perder agrupación tras eliminar evento
      const eventIds = [...new Set(regs.map(r => r.eventId ?? r.archivedEventId).filter(Boolean))] as string[];
      const matchResults = await Promise.all(
        eventIds.map(eventId => fetch(`/api/matches?eventId=${eventId}`).then(r => r.json()))
      );
      const matchMap: Record<string, { selections: Record<string, string[]> }> = {};
      eventIds.forEach((id, i) => { matchMap[id] = matchResults[i]; });
      setMatchDataByEvent(matchMap);
    } catch (e) {
      console.error('Error cargando participantes:', e);
    } finally {
      setParticipantsLoading(false);
    }
  };

  const getMatchesForReg = (reg: RegistrationWithEvent): RegistrationWithEvent[] => {
    const groupId = reg.eventId ?? reg.archivedEventId;
    if (!groupId) return [];
    const matchData = matchDataByEvent[groupId];
    if (!matchData?.selections) return [];
    const eventRegs = allRegistrations.filter(r => (r.eventId ?? r.archivedEventId) === groupId);
    const mySelections: string[] = matchData.selections[reg.id] || [];
    return eventRegs.filter(other =>
      other.id !== reg.id &&
      mySelections.includes(other.id) &&
      (matchData.selections[other.id] || []).includes(reg.id)
    );
  };

  // Fetch repeated match data when an event is expanded
  useEffect(() => {
    if (!expandedEvent || repeatedMatchData[expandedEvent]) return;
    fetch(`/api/matches/repeated?eventId=${expandedEvent}`)
      .then(r => r.json())
      .then(data => {
        setRepeatedMatchData(prev => ({ ...prev, [expandedEvent]: data.priorMatches || {} }));
      })
      .catch(() => {});
  }, [expandedEvent]);

  /* ── Auth State: login una sola vez ── */
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Auto-load participantes al entrar al tab (después de declarar isAuthenticated)
  useEffect(() => {
    if (activeTab === 'participants' && isAuthenticated && allRegistrations.length === 0 && !participantsLoading) {
      loadParticipants();
    }
  }, [activeTab, isAuthenticated]);

  // Cargar catálogo de tragos al autenticarse y al entrar al tab
  useEffect(() => {
    if (isAuthenticated && drinkCatalog.length === 0) {
      loadDrinkCatalog();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeTab === 'drinks' && isAuthenticated) {
      loadDrinkCatalog();
    }
    if (activeTab === 'tatuadores' && isAuthenticated) {
      loadTatuadores();
    }
    if (activeTab === 'contenido' && isAuthenticated) {
      loadContenido();
    }
  }, [activeTab]);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentAdminPassword, setCurrentAdminPassword] = useState(''); // Store successful password to use in API calls

  /* ── Change Password State ── */
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  /* ── Create Event Form State ── */
  const [createEventType, setCreateEventType] = useState('');

  /* ── Drink catalog from DB ── */
  const [drinkCatalog, setDrinkCatalog] = useState<Drink[]>([]);
  const [newDrinkName, setNewDrinkName] = useState('');
  const [newDrinkAlcoholic, setNewDrinkAlcoholic] = useState(false);
  const [drinksLoading, setDrinksLoading] = useState(false);

  /* ── Drink Tag State (for event creation) ── */
  const [selectedDrinks, setSelectedDrinks] = useState<string[]>([]);
  const [customDrink, setCustomDrink] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword })
      });
      if (res.ok) {
        setIsAuthenticated(true);
        setCurrentAdminPassword(loginPassword);
        setLoginError('');
      } else {
        setLoginError('Contraseña incorrecta');
      }
    } catch (err) {
      setLoginError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentAdminPassword, newPassword })
      });
      
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al cambiar contraseña');
      }
      
      setCurrentAdminPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showSuccess('✅ Contraseña actualizada correctamente');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show success message temporarily
  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 5000);
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('¿Estás seguro de que querés eliminar este evento? Los inscriptos quedarán en la base de datos de participantes.')) return;

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: currentAdminPassword })
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
      const res = await fetch(`/api/registrations/${regId}?pwd=${encodeURIComponent(currentAdminPassword)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Error al eliminar inscripción');
      
      showSuccess('✅ Inscripción eliminada.');
      await reloadEvents();
      if (activeTab === 'participants') await loadParticipants();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMarkAsPaid = async (regId: string, name: string) => {
    if (!window.confirm(`¿Confirmar que ${name} realizó la transferencia y marcar como pagado?`)) return;

    try {
      const res = await fetch(`/api/registrations/${regId}?pwd=${encodeURIComponent(currentAdminPassword)}`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Error al actualizar pago');
      
      showSuccess('✅ Pago confirmado correctamente.');
      await reloadEvents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddParticipant = async () => {
    if (!addParticipantEventId) return;
    if (!addPartForm.firstName.trim() || !addPartForm.lastName.trim()) {
      setError('Nombre y apellido son obligatorios.');
      return;
    }
    if (!addPartForm.phone.trim() && !addPartForm.email.trim() && !addPartForm.instagram.trim()) {
      setError('Se necesita al menos un dato de contacto (teléfono, email o Instagram).');
      return;
    }
    setAddPartLoading(true);
    try {
      const res = await fetch('/api/registrations/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addPartForm,
          eventId: addParticipantEventId,
          password: currentAdminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error agregando participante');
      showSuccess(`✅ ${addPartForm.firstName} ${addPartForm.lastName} agregado/a al evento.`);
      setAddParticipantEventId(null);
      setAddPartForm({ firstName: '', lastName: '', gender: 'Hombre', instagram: '', phone: '', email: '', selectedDrink: '', markAsPaid: true });
      await reloadEvents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddPartLoading(false);
    }
  };

  const handleDeleteParticipant = async (regIds: string[], name: string) => {
    if (!window.confirm(`¿Eliminar a ${name} de la base de datos? Se borrarán ${regIds.length} inscripción/nes.`)) return;
    try {
      await Promise.all(
        regIds.map(id =>
          fetch(`/api/registrations/${id}?pwd=${encodeURIComponent(currentAdminPassword)}`, { method: 'DELETE' })
        )
      );
      showSuccess(`✅ ${name} eliminado/a de la base de datos.`);
      await loadParticipants();
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

  const loadDrinkCatalog = async () => {
    setDrinksLoading(true);
    try {
      const data = await fetch('/api/drinks').then(r => r.json());
      setDrinkCatalog(data);
    } catch {}
    finally { setDrinksLoading(false); }
  };

  const handleAddDrink = async () => {
    const trimmed = newDrinkName.trim();
    if (!trimmed) return;
    setDrinksLoading(true);
    try {
      const res = await fetch('/api/drinks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, isAlcoholic: newDrinkAlcoholic, password: currentAdminPassword }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      setNewDrinkName('');
      setNewDrinkAlcoholic(false);
      await loadDrinkCatalog();
    } catch {} finally { setDrinksLoading(false); }
  };

  const handleDeleteDrink = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}" del catálogo?`)) return;
    setDrinksLoading(true);
    try {
      const res = await fetch('/api/drinks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password: currentAdminPassword }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error); return; }
      setSelectedDrinks(prev => prev.filter(d => d !== name));
      await loadDrinkCatalog();
    } catch {} finally { setDrinksLoading(false); }
  };

  const loadTatuadores = async () => {
    setTatuadoresLoading(true);
    try {
      const res = await fetch('/api/tatuadores');
      const data = await res.json();
      setTatuadoresList(Array.isArray(data) ? data : []);
    } catch {} finally { setTatuadoresLoading(false); }
  };

  const handleSaveTatuador = async () => {
    if (!tatForm.name.trim() || !tatForm.specialty.trim() || !tatForm.phone.trim()) {
      alert('Nombre, especialidad y teléfono son obligatorios.'); return;
    }
    setTatuadoresLoading(true);
    try {
      const method = tatEditId ? 'PUT' : 'POST';
      const body = tatEditId ? { ...tatForm, id: tatEditId, active: true, password: currentAdminPassword } : { ...tatForm, password: currentAdminPassword };
      const res = await fetch('/api/tatuadores', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      setTatForm({ name: '', specialty: '', bio: '', phone: '', instagram: '', photoUrl: '', order: 0 });
      setTatEditId(null);
      await loadTatuadores();
    } catch {} finally { setTatuadoresLoading(false); }
  };

  const handleDeleteTatuador = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar a ${name} del listado?`)) return;
    setTatuadoresLoading(true);
    try {
      const res = await fetch('/api/tatuadores', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, password: currentAdminPassword }) });
      if (!res.ok) { const d = await res.json(); alert(d.error); return; }
      await loadTatuadores();
    } catch {} finally { setTatuadoresLoading(false); }
  };

  // Convierte una clave VAPID base64url a ArrayBuffer (requerido por todos los browsers)
  const urlBase64ToUint8Array = (base64String: string): ArrayBuffer => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer as ArrayBuffer;
  };

  const subscribeToPush = async () => {
    try {
      setLoading(true);

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Este navegador no soporta notificaciones Push. Probá con Chrome o Firefox.');
      }

      // 1. Solicitar permiso explícito
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permiso de notificaciones denegado. Habilitalo en la configuración del navegador.');
      }

      // 2. Registrar SW y esperar a que esté listo
      await navigator.serviceWorker.register('/sw.js');
      const registration = await navigator.serviceWorker.ready;

      // 3. Obtener clave pública VAPID y convertirla a Uint8Array
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        throw new Error('Error de configuración: No se encontró la clave pública VAPID.');
      }
      const convertedKey = urlBase64ToUint8Array(publicVapidKey);

      // 4. Verificar si ya hay una suscripción activa
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Ya existe — la re-enviamos al servidor para sincronizar
        console.log('ℹ️ Ya había una suscripción Push, actualizando en servidor...');
      } else {
        // 5. Crear nueva suscripción
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });
      }

      // 6. Guardar/actualizar en el servidor
      const res = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, password: currentAdminPassword }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar la suscripción');
      }

      showSuccess('✅ ¡Listo! Este dispositivo recibirá notificaciones push.');
    } catch (err: any) {
      console.error('Push error:', err);
      setError(err.message || 'Error activando notificaciones');
    } finally {
      setLoading(false);
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
      price: formData.get('price'),
      drinksAvailable: selectedDrinks.join(', '),
      password: currentAdminPassword,
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
      setCreateEventType('');
      await reloadEvents();
      setActiveTab('events');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Pantalla de Login ── */
  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '400px', margin: '4rem auto', textAlign: 'center', padding: '0 1rem' }}>
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
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="input-field"
                placeholder="Contraseña de Admin"
                autoFocus
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout-v2">
      {/* ── Global prior-match tooltip ── */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: Math.min(tooltip.x + 12, window.innerWidth - 360),
          top: tooltip.y - 8,
          transform: 'translateY(-100%)',
          background: '#0a0a0a',
          color: '#fff',
          padding: '0.5rem 0.85rem',
          borderRadius: '8px',
          fontSize: '0.8rem',
          border: '1px solid var(--neon-pink)',
          boxShadow: '0 0 12px rgba(255,16,122,0.6), 0 0 24px rgba(255,16,122,0.2)',
          zIndex: 9999,
          maxWidth: 'min(340px, 80vw)',
          whiteSpace: 'normal',
          lineHeight: 1.5,
          pointerEvents: 'none',
        }}>
          {tooltip.text}
        </div>
      )}
      {/* ── Desktop Sidebar ── */}
      <div className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="admin-sidebar-header">
          {!sidebarCollapsed && <div style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '1px', fontFamily: 'var(--font-outfit)', color: 'var(--neon-pink)' }}>KEROP ADMIN</div>}
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem' }}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>
        
        <div style={{ padding: '1rem 0', flexGrow: 1 }}>
          <div className={`admin-nav-item ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
            <span className="admin-nav-icon">📅</span>
            <span className="admin-nav-label">Eventos Disponibles</span>
          </div>
          <div className={`admin-nav-item ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
            <span className="admin-nav-icon">➕</span>
            <span className="admin-nav-label">Agregar Evento</span>
          </div>
          <div className={`admin-nav-item ${activeTab === 'matches' ? 'active' : ''}`} onClick={() => { setActiveTab('matches'); setMatchResults(null); }}>
            <span className="admin-nav-icon">💘</span>
            <span className="admin-nav-label">Matches</span>
          </div>
          <div className={`admin-nav-item ${activeTab === 'participants' ? 'active' : ''}`} onClick={() => { setActiveTab('participants'); loadParticipants(); }}>
            <span className="admin-nav-icon">👥</span>
            <span className="admin-nav-label">Participantes</span>
          </div>
          <div className={`admin-nav-item ${activeTab === 'drinks' ? 'active' : ''}`} onClick={() => setActiveTab('drinks')}>
            <span className="admin-nav-icon">🍹</span>
            <span className="admin-nav-label">Tragos</span>
          </div>
          <div className={`admin-nav-item ${activeTab === 'tatuadores' ? 'active' : ''}`} onClick={() => setActiveTab('tatuadores')}>
            <span className="admin-nav-icon">🎨</span>
            <span className="admin-nav-label">Tatuadores</span>
          </div>
          <div className={`admin-nav-item ${activeTab === 'contenido' ? 'active' : ''}`} onClick={() => setActiveTab('contenido')}>
            <span className="admin-nav-icon">✏️</span>
            <span className="admin-nav-label">Contenido</span>
          </div>
          <div className={`admin-nav-item ${activeTab === 'password' ? 'active' : ''}`} onClick={() => setActiveTab('password')}>
            <span className="admin-nav-icon">🔑</span>
            <span className="admin-nav-label">Cambiar Contraseña</span>
          </div>
        </div>
        
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <button 
            onClick={() => { setIsAuthenticated(false); setLoginPassword(''); }}
            style={{ background: 'rgba(255,16,122,0.1)', border: '1px solid rgba(255,16,122,0.2)', color: 'var(--neon-pink)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
          >
            <span>🚪</span>
            <span className="admin-nav-label">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <div className="admin-mobile-nav">
        <div className="admin-mobile-nav-content">
          <div className={`admin-mobile-nav-item ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
            <span className="admin-nav-icon">📅</span>
            <span>Eventos</span>
          </div>
          <div className={`admin-mobile-nav-item ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
            <span className="admin-nav-icon">➕</span>
            <span>Agregar</span>
          </div>
          <div className={`admin-mobile-nav-item ${activeTab === 'matches' ? 'active' : ''}`} onClick={() => { setActiveTab('matches'); setMatchResults(null); }}>
            <span className="admin-nav-icon">💘</span>
            <span>Matches</span>
          </div>
          <div className={`admin-mobile-nav-item ${activeTab === 'participants' ? 'active' : ''}`} onClick={() => { setActiveTab('participants'); loadParticipants(); }}>
            <span className="admin-nav-icon">👥</span>
            <span>Participantes</span>
          </div>
          <div className={`admin-mobile-nav-item ${activeTab === 'drinks' ? 'active' : ''}`} onClick={() => setActiveTab('drinks')}>
            <span className="admin-nav-icon">🍹</span>
            <span>Tragos</span>
          </div>
          <div className={`admin-mobile-nav-item ${activeTab === 'tatuadores' ? 'active' : ''}`} onClick={() => setActiveTab('tatuadores')}>
            <span className="admin-nav-icon">🎨</span>
            <span>Tatuadores</span>
          </div>
          <div className={`admin-mobile-nav-item ${activeTab === 'contenido' ? 'active' : ''}`} onClick={() => setActiveTab('contenido')}>
            <span className="admin-nav-icon">✏️</span>
            <span>Contenido</span>
          </div>
          <div className={`admin-mobile-nav-item ${activeTab === 'password' ? 'active' : ''}`} onClick={() => setActiveTab('password')}>
            <span className="admin-nav-icon">🔑</span>
            <span>Clave</span>
          </div>
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="admin-content-area">
        {success && (
          <div style={{ backgroundColor: 'rgba(57, 255, 20, 0.1)', border: '1px solid rgba(57,255,20,0.3)', color: 'var(--neon-green)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{success}</span>
            <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', color: 'var(--neon-green)', cursor: 'pointer' }}>✕</button>
          </div>
        )}
        {error && (
          <div style={{ backgroundColor: 'rgba(255, 16, 122, 0.1)', border: '1px solid rgba(255,16,122,0.3)', color: 'var(--neon-pink)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* ─── TAB: EVENTOS DISPONIBLES ─── */}
        {activeTab === 'events' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Eventos Publicados</h3>
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
                <p>No hay eventos creados aún. Usá "Agregar Evento" para crear el primero.</p>
                <button onClick={() => setActiveTab('create')} className="btn btn-outline" style={{ marginTop: '1.5rem', padding: '0.5rem 1.5rem' }}>+ Agregar Evento</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {eventList.map((ev) => {
                  const total = (ev.registrations || []).length;
                  const isExpanded = expandedEvent === ev.id;
                  const drinksList = (ev.drinksAvailable || '').split(',').map(d => d.trim()).filter(Boolean);
                  
                  const isHH = ev.type === 'Ellos y Ellos';
                  const isMM = ev.type === 'Ellas y Ellas';
                  const totalSpotsMen = ev.spotsPerGender;
                  const totalSpotsWomen = ev.spotsPerGender;
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', paddingRight: '4.5rem' }}>
                        <div>
                          <h4 style={{ fontSize: '1.3rem', marginBottom: '0.3rem' }}>{ev.type}</h4>
                          <p style={{ color: 'var(--neon-cyan)', fontSize: '0.95rem' }}>
                            {format(new Date(ev.date), "EEEE d 'de' MMMM yyyy 'a las' HH:mm 'hs'", { locale: es })}
                          </p>
                        </div>
                      </div>

                      {/* Métricas estructuradas */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Rango Etario</div>
                          <div style={{ fontWeight: 600, color: 'white' }}>{ev.ageRange}</div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Precio</div>
                          <div style={{ fontWeight: 600, color: 'white' }}>${ev.price || 850}</div>
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
                        {drinksList.map((drink, idx) => {
                          const isAlcoholic = drinkCatalog.find(d => d.name === drink.trim())?.isAlcoholic ?? false;
                          return (
                            <span key={idx} style={{
                              background: isAlcoholic ? 'rgba(255,16,122,0.1)' : 'rgba(57,255,20,0.1)',
                              color: isAlcoholic ? 'var(--neon-pink)' : 'var(--neon-green)',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '50px',
                              fontSize: '0.75rem',
                              border: `1px solid ${isAlcoholic ? 'rgba(255,16,122,0.2)' : 'rgba(57,255,20,0.2)'}`,
                            }}>
                              {drink}
                            </span>
                          );
                        })}
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

                      {(() => {
                        // Cupos reales disponibles (usando registros pagados como referencia)
                        const spotsLeftMen = Math.max(0, totalSpotsMen - paidMen);
                        const spotsLeftWomen = Math.max(0, totalSpotsWomen - paidWomen);
                        const hasSpots = isHH || isMM
                          ? (spotsLeftMen > 0 || spotsLeftWomen > 0)
                          : (spotsLeftMen > 0 || spotsLeftWomen > 0);
                        return (
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: total > 0 && isExpanded ? '1rem' : total > 0 ? '1rem' : 0 }}>
                            {total > 0 && (
                              <button
                                onClick={() => setExpandedEvent(isExpanded ? null : ev.id)}
                                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.3s' }}
                              >
                                {isExpanded ? '▲ Ocultar inscriptos' : `▼ Ver ${total} inscripto${total !== 1 ? 's' : ''}`}
                              </button>
                            )}
                            {total > 0 && (
                              <a
                                href={`/admin/planilla/${ev.id}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#fde047', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'none', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                              >
                                <span>🖨️</span> Descargar Planilla
                              </a>
                            )}
                            <button
                              onClick={() => hasSpots ? setAddParticipantEventId(ev.id) : undefined}
                              disabled={!hasSpots}
                              title={!hasSpots ? 'Evento sin cupos disponibles' : 'Agregar participante manualmente'}
                              style={{ background: hasSpots ? 'rgba(57,255,20,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${hasSpots ? 'rgba(57,255,20,0.35)' : 'rgba(255,255,255,0.08)'}`, color: hasSpots ? 'var(--neon-green)' : 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: hasSpots ? 'pointer' : 'not-allowed', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: hasSpots ? 1 : 0.4 }}
                            >
                              <span>➕</span> {hasSpots ? 'Agregar Participante' : 'Sin cupos'}
                            </button>
                          </div>
                        );
                      })()}

                      {total > 0 && isExpanded && (
                            <div style={{ width: '100%', borderRadius: '10px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.2)' }}>
                              <table style={{ minWidth: '700px', width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                  <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, width: '40px' }}>#</th>
                                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Nombre</th>
                                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Género</th>
                                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Trago</th>
                                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Registrado</th>
                                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500, width: '120px' }}>Pago</th>
                                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500, width: '60px' }}>Acción</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ev.registrations.map((reg, idx) => {
                                    const allPriorPartners = repeatedMatchData[ev.id]?.[reg.id] || [];
                                    // Filter to only partners who are also in this event
                                    const identityOf = (r: { instagram?: string | null; firstName: string; lastName: string }) =>
                                      r.instagram ? r.instagram.toLowerCase().replace('@', '').trim() : `${r.firstName}_${r.lastName}`.toLowerCase().trim();
                                    const currentIdentities = new Set(ev.registrations.map(identityOf));
                                    const priorMatchHere = allPriorPartners.filter(p => currentIdentities.has(identityOf(p)));
                                    const hasPriorMatch = priorMatchHere.length > 0;
                                    return (
                                    <tr key={reg.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: hasPriorMatch ? 'rgba(255,221,0,0.18)' : undefined, boxShadow: hasPriorMatch ? 'inset 3px 0 0 #ffdd00' : undefined }}>
                                      <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600, whiteSpace: 'nowrap', color: hasPriorMatch ? 'var(--neon-pink)' : undefined }}>
                                        {reg.firstName} {reg.lastName}
                                        {hasPriorMatch && (
                                          <span
                                            className="prior-match-badge"
                                            onMouseEnter={e => showTooltip(`Match previo con: ${priorMatchHere.map(p => `${p.firstName} ${p.lastName}${p.instagram ? ` (${p.instagram})` : ''}`).join(', ')}`, e)}
                                            onMouseLeave={hideTooltip}
                                          >
                                            💞
                                          </span>
                                        )}
                                      </td>
                                      <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>{reg.gender === 'Hombre' ? '👨' : '👩'}</td>
                                      <td style={{ padding: '0.6rem 0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={reg.selectedDrink}>
                                        <span style={{ 
                                          background: drinkCatalog.find(d => d.name === reg.selectedDrink)?.isAlcoholic ? 'rgba(255,16,122,0.1)' : 'rgba(57,255,20,0.1)',
                                          color: drinkCatalog.find(d => d.name === reg.selectedDrink)?.isAlcoholic ? 'var(--neon-pink)' : 'var(--neon-green)',
                                          padding: '0.2rem 0.6rem',
                                          borderRadius: '50px',
                                          fontSize: '0.75rem',
                                          border: `1px solid ${drinkCatalog.find(d => d.name === reg.selectedDrink)?.isAlcoholic ? 'rgba(255,16,122,0.2)' : 'rgba(57,255,20,0.2)'}`,
                                        }}>
                                          {reg.selectedDrink}
                                        </span>
                                      </td>
                                      <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {format(new Date(reg.createdAt), "dd/MM HH:mm")}
                                      </td>
                                      <td style={{ padding: '0.4rem 0.8rem', textAlign: 'center' }}>
                                        {reg.paid ? (
                                          <span style={{ background: 'rgba(57,255,20,0.1)', color: 'var(--neon-green)', padding: '0.15rem 0.5rem', borderRadius: '50px', fontSize: '0.75rem', border: '1px solid rgba(57,255,20,0.2)', whiteSpace: 'nowrap' }}>
                                            ✅ Pagado
                                          </span>
                                        ) : (
                                          <span style={{ background: 'rgba(255,16,122,0.1)', color: 'var(--neon-pink)', padding: '0.15rem 0.5rem', borderRadius: '50px', fontSize: '0.75rem', border: '1px solid rgba(255,16,122,0.2)', whiteSpace: 'nowrap' }}>
                                            ⏳ Pendiente
                                          </span>
                                        )}
                                      </td>
                                      <td style={{ padding: '0.4rem 0.8rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                          {!reg.paid && reg.paymentMethod === 'transfer' && (
                                            <button
                                              onClick={() => handleMarkAsPaid(reg.id, reg.firstName)}
                                              style={{ background: 'rgba(57,255,20,0.15)', color: 'var(--neon-green)', border: '1px solid rgba(57,255,20,0.4)', borderRadius: '6px', fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                              title="Confirmar pago por transferencia"
                                            >
                                              💰 Pagó
                                            </button>
                                          )}
                                          <button
                                            onClick={() => handleDeleteRegistration(reg.id, `${reg.firstName} ${reg.lastName}`)}
                                            style={{ background: 'none', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.7 }}
                                            title="Eliminar inscripto"
                                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                                          >
                                            🗑️
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: AGREGAR EVENTO ─── */}
        {activeTab === 'create' && (
          <div className="glass-card" style={{ border: '1px solid rgba(255,16,122,0.2)', maxWidth: '800px', margin: '0 auto' }}>
            <h3 className="text-pink" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Nuevo Evento</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Completá los datos para publicar una fecha de Speed Dating.</p>

            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="input-label">Categoría del Evento</label>
                <select name="type" required value={createEventType} onChange={e => setCreateEventType(e.target.value)} className="input-field">
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
                  <label className="input-label">Hora (Formato 24hs)</label>
                  <input 
                    type="text" 
                    name="time" 
                    required 
                    className="input-field" 
                    defaultValue="20:00" 
                    placeholder="20:00" 
                    pattern="^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$"
                    title="Formato 24 horas, ej: 20:00"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="input-label">Rango Etario</label>
                  <input type="text" name="ageRange" required className="input-field" placeholder="Ej: 25 a 35 años" />
                </div>
                <div>
                  <label className="input-label">
                    {createEventType === 'Ellos y Ellos' || createEventType === 'Ellas y Ellas'
                      ? 'Cupo Total'
                      : 'Cupos por Género'}
                  </label>
                  <input type="number" name="spotsPerGender" required className="input-field" defaultValue="8" min="1" max="100" />
                  {(createEventType === 'Ellos y Ellos' || createEventType === 'Ellas y Ellas') && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                      Para eventos mismo sexo es el cupo total del evento.
                    </p>
                  )}
                  {createEventType === 'Ellos y Ellas' && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                      Se aplica por separado a Hombres y Mujeres (total = ×2).
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div>
                  <label className="input-label">Precio del Evento (UYU)</label>
                  <input type="number" name="price" required className="input-field" defaultValue="20" min="10" />
                  <p style={{ color: 'gray', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                    * Para pruebas con MercadoPago, el monto mínimo aceptado suele ser 20 UYU.
                  </p>
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
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                  Gestioná el catálogo completo en el tab <strong>Tragos</strong>. Aquí solo seleccionás cuáles ofrecer en este evento.
                </p>

                {/* Sin alcohol */}
                {drinkCatalog.filter(d => !d.isAlcoholic).length > 0 && (
                  <>
                    <p style={{ color: 'var(--neon-cyan)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', margin: '0.5rem 0 0.4rem', fontWeight: 600 }}>Sin Alcohol</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {drinkCatalog.filter(d => !d.isAlcoholic).map(drink => {
                        const active = selectedDrinks.includes(drink.name);
                        return (
                          <button key={drink.id} type="button" onClick={() => toggleDrink(drink.name)} style={{
                            padding: '0.35rem 0.7rem', borderRadius: '50px',
                            border: `1px solid ${active ? 'rgba(57,255,20,0.5)' : 'rgba(255,255,255,0.1)'}`,
                            background: active ? 'rgba(57,255,20,0.15)' : 'rgba(0,0,0,0.3)',
                            color: active ? 'var(--neon-green)' : 'var(--text-muted)',
                            cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.2s',
                          }}>
                            {active ? '✓ ' : ''}{drink.name}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Alcohólicas */}
                {drinkCatalog.filter(d => d.isAlcoholic).length > 0 && (
                  <>
                    <p style={{ color: 'var(--neon-pink)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', margin: '0.75rem 0 0.4rem', fontWeight: 600 }}>Alcohólicas</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {drinkCatalog.filter(d => d.isAlcoholic).map(drink => {
                        const active = selectedDrinks.includes(drink.name);
                        return (
                          <button key={drink.id} type="button" onClick={() => toggleDrink(drink.name)} style={{
                            padding: '0.35rem 0.7rem', borderRadius: '50px',
                            border: `1px solid ${active ? 'rgba(255,16,122,0.5)' : 'rgba(255,255,255,0.1)'}`,
                            background: active ? 'rgba(255,16,122,0.15)' : 'rgba(0,0,0,0.3)',
                            color: active ? 'var(--neon-pink)' : 'var(--text-muted)',
                            cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.2s',
                          }}>
                            {active ? '✓ ' : ''}{drink.name}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Temporales (no están en catálogo) */}
                {selectedDrinks.filter(d => !drinkCatalog.find(c => c.name === d)).length > 0 && (
                  <>
                    <p style={{ color: 'var(--chalk-yellow)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', margin: '0.75rem 0 0.4rem', fontWeight: 600 }}>Solo este evento</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {selectedDrinks.filter(d => !drinkCatalog.find(c => c.name === d)).map(drink => (
                        <button key={drink} type="button" onClick={() => toggleDrink(drink)} style={{
                          padding: '0.35rem 0.7rem', borderRadius: '50px',
                          border: '1px solid rgba(245,242,66,0.5)', background: 'rgba(245,242,66,0.15)',
                          color: 'var(--chalk-yellow)', cursor: 'pointer', fontSize: '0.78rem',
                        }}>
                          ✓ {drink} ✕
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Add temporal */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <input
                    type="text"
                    value={customDrink}
                    onChange={(e) => setCustomDrink(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomDrink(); } }}
                    className="input-field"
                    placeholder="Trago solo para este evento..."
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                  />
                  <button type="button" onClick={addCustomDrink} style={{
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                    color: 'white', borderRadius: '8px', padding: '0.5rem 1rem',
                    cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap',
                  }}>
                    + Agregar
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
                {loading ? 'Creando evento...' : '+ Publicar Evento'}
              </button>
            </form>
          </div>
        )}

        {/* ─── TAB: MATCHES ─── */}
        {activeTab === 'matches' && (() => {
          // Eventos con cupo completo: mixto = spotsPerGender * 2 (hombres + mujeres), HH/MM = spotsPerGender total
          const fullEvents = eventList.filter(ev => {
            const isHomo = ev.type === 'Ellos y Ellos' || ev.type === 'Ellas y Ellas';
            const totalSpots = isHomo ? ev.spotsPerGender : ev.spotsPerGender * 2;
            const paidCount = ev.registrations.filter(r => r.paid).length;
            return paidCount >= totalSpots;
          });

          const selectedEvent = matchEventId ? eventList.find(e => e.id === matchEventId) : null;
          const paidRegs = selectedEvent?.registrations.filter(r => r.paid) || [];
          const men = paidRegs.filter(r => r.gender === 'Hombre');
          const women = paidRegs.filter(r => r.gender === 'Mujer');
          const isHomoEvent = selectedEvent?.type === 'Ellos y Ellos' || selectedEvent?.type === 'Ellas y Ellas';
          const allParticipants = isHomoEvent ? paidRegs : null;

          const toggleSelection = (fromId: string, toId: string) => {
            setMatchResults(null);
            setMatchSelections(prev => {
              const current = prev[fromId] || [];
              const updated = current.includes(toId)
                ? current.filter(id => id !== toId)
                : [...current, toId];
              const next = { ...prev, [fromId]: updated };
              // Autosave: persiste cada cambio sin necesidad de un botón Guardar
              if (matchEventId) {
                fetch('/api/matches', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ eventId: matchEventId, selections: next, password: currentAdminPassword }),
                }).catch(() => { /* fallo silencioso — handleMatchear vuelve a guardar */ });
              }
              return next;
            });
          };

          const handleLoadSelections = async (eventId: string) => {
            setMatchEventId(eventId);
            setMatchResults(null);
            try {
              const res = await fetch(`/api/matches?eventId=${eventId}`);
              const data = await res.json();
              setMatchSelections(data.selections || {});
            } catch {
              setMatchSelections({});
            }
          };

          const handleToggleAttended = async (regId: string) => {
            try {
              await fetch('/api/matches', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: matchEventId, toggleAttended: regId, password: currentAdminPassword }),
              });
              await reloadEvents();
            } catch { setError('Error actualizando asistencia'); }
          };

          const handleMatchear = async () => {
            if (!matchEventId) return;
            setMatchLoading(true);
            try {
              // Guardar primero
              await fetch('/api/matches', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: matchEventId, selections: matchSelections, password: currentAdminPassword }),
              });
              // Calcular
              const res = await fetch('/api/matches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: matchEventId, password: currentAdminPassword }),
              });
              const data = await res.json();
              setMatchResults(data);
            } catch { setError('Error calculando matches'); }
            finally { setMatchLoading(false); }
          };

          // Render de una matriz cruzada
          const renderMatrix = (rowParticipants: Registration[], colParticipants: Registration[], title: string) => (
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ color: 'var(--neon-pink)', marginBottom: '1rem', fontSize: '1.1rem' }}>{title}</h4>
              <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${colParticipants.length * 90 + 180}px` }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,16,122,0.08)', color: 'var(--neon-pink)', fontSize: '0.8rem', position: 'sticky', left: 0, zIndex: 2, minWidth: '170px' }}>
                        <span style={{ marginLeft: '2.25rem' }}>Participante</span>
                      </th>
                      {colParticipants.map(col => {
                        const colNotAttended = col.attended === false;
                        return (
                          <th key={col.id} style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,16,122,0.05)', fontSize: '0.75rem', color: colNotAttended ? 'rgba(255,255,255,0.25)' : 'white', minWidth: '80px', lineHeight: 1.2, opacity: colNotAttended ? 0.35 : 1 }}>
                            {col.firstName}<br/><span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{col.lastName}</span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rowParticipants.map(row => {
                      const notAttended = row.attended === false;
                      return (
                        <tr key={row.id} style={{ transition: 'opacity 0.2s' }}>
                          <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)', position: 'sticky', left: 0, zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div
                                onClick={() => handleToggleAttended(row.id)}
                                title={notAttended ? 'Marcar como asistió' : 'Marcar como NO asistió'}
                                style={{
                                  width: '24px', height: '24px', borderRadius: '6px', cursor: 'pointer', flexShrink: 0,
                                  border: notAttended ? '2px solid rgba(255,80,80,0.6)' : '2px solid rgba(57,255,20,0.4)',
                                  background: notAttended ? 'rgba(255,80,80,0.2)' : 'rgba(57,255,20,0.1)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s', fontSize: '0.7rem'
                                }}
                              >
                                {notAttended ? '✕' : '✓'}
                              </div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: notAttended ? 'rgba(255,255,255,0.3)' : 'white', textDecoration: notAttended ? 'line-through' : 'none', transition: 'all 0.2s' }}>
                                {row.firstName} {row.lastName[0]}.
                              </span>
                            </div>
                          </td>
                          {colParticipants.map(col => {
                            if (row.id === col.id) return (
                              <td key={col.id} style={{ textAlign: 'center', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', opacity: notAttended ? 0.2 : 1 }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>—</span>
                              </td>
                            );
                            const isSelected = (matchSelections[row.id] || []).includes(col.id);
                            const colNotAttended = col.attended === false;
                            const isDisabled = notAttended || colNotAttended;
                            return (
                              <td key={col.id} style={{ textAlign: 'center', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: isDisabled ? 'not-allowed' : 'pointer', background: isSelected && !isDisabled ? 'rgba(255,16,122,0.15)' : 'transparent', transition: 'background 0.2s', opacity: isDisabled ? 0.2 : 1 }}
                                onClick={() => !isDisabled && toggleSelection(row.id, col.id)}
                              >
                                <div style={{
                                  width: '24px', height: '24px', borderRadius: '6px', margin: '0 auto',
                                  border: isSelected ? '2px solid var(--neon-pink)' : '2px solid rgba(255,255,255,0.15)',
                                  background: isSelected ? 'rgba(255,16,122,0.3)' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s', fontSize: '0.8rem'
                                }}>
                                  {isSelected && !isDisabled && '💘'}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );

          const handleCreateTestEvent = async () => {
            const typeChoice = prompt('Tipo de evento:\n1 = Ellos y Ellas (Mixto)\n2 = Ellos y Ellos (HH)\n3 = Ellas y Ellas (MM)');
            if (!typeChoice) return;
            const typeMap: Record<string, string> = { '1': 'Ellos y Ellas', '2': 'Ellos y Ellos', '3': 'Ellas y Ellas' };
            const eventType = typeMap[typeChoice.trim()];
            if (!eventType) { alert('Opción inválida. Ingresá 1, 2 o 3.'); return; }
            const spots = prompt('¿Cuántos cupos por género? (ej: 4)');
            if (!spots) return;
            setMatchLoading(true);
            try {
              const res = await fetch('/api/test-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: currentAdminPassword, spotsPerGender: parseInt(spots), type: eventType }),
              });
              const data = await res.json();
              if (data.ok) {
                showSuccess(data.message);
                await reloadEvents();
              } else { setError(data.error); }
            } catch { setError('Error creando evento de prueba'); }
            finally { setMatchLoading(false); }
          };

          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>💘 Matches</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargá las planillas del evento y descubrí quiénes hicieron match.</p>
                </div>
                <button
                  onClick={handleCreateTestEvent}
                  disabled={matchLoading}
                  style={{ background: 'rgba(0,255,255,0.1)', border: '1px solid rgba(0,255,255,0.3)', color: 'var(--neon-cyan)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' }}
                >
                  🧪 Generar Evento de Prueba
                </button>
              </div>

              {/* Selector de evento */}
              <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                <label className="input-label">Seleccionar Evento</label>
                {fullEvents.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>No hay eventos con cupo completo todavía. Los eventos aparecen acá cuando todos los cupos están pagados.</p>
                ) : (
                  <select
                    className="input-field"
                    value={matchEventId || ''}
                    onChange={(e) => e.target.value && handleLoadSelections(e.target.value)}
                    style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', paddingRight: '3rem' }}
                  >
                    <option value="">Elegí un evento...</option>
                    {fullEvents.map(ev => (
                      <option key={ev.id} value={ev.id} style={{ background: '#000' }}>
                        {ev.type} — {format(new Date(ev.date), "dd/MM/yyyy", { locale: es })} ({ev.registrations.filter(r => r.paid).length} pagados)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Matrices */}
              {selectedEvent && (
                <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1.2rem', color: 'white' }}>{selectedEvent.type}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{format(new Date(selectedEvent.date), "EEEE d 'de' MMMM yyyy", { locale: es })} • {paidRegs.length} participantes pagados</p>
                    </div>
                  </div>

                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                    📋 Leé la planilla de cada participante y tildá a quién le puso match. Tocá el <span style={{ color: 'var(--neon-green)' }}>✓</span> para marcar a alguien que no asistió (queda gris). <span style={{ color: 'var(--neon-green)' }}>💾 Los cambios se guardan automáticamente.</span>
                  </p>

                  {isHomoEvent && allParticipants ? (
                    renderMatrix(allParticipants, allParticipants, `${selectedEvent.type} — Todos × Todos`)
                  ) : (
                    <>
                      {renderMatrix(men, women, '🙋‍♂️ Hombres → Mujeres (¿a quién le puso match?)')}
                      {renderMatrix(women, men, '🙋‍♀️ Mujeres → Hombres (¿a quién le puso match?)')}
                    </>
                  )}

                  <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <button
                      onClick={handleMatchear}
                      disabled={matchLoading}
                      style={{
                        background: 'linear-gradient(135deg, var(--neon-pink), #9b59b6)',
                        color: 'white', border: 'none', padding: '1rem 3rem', borderRadius: '12px',
                        fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(255,16,122,0.4)',
                        transition: 'all 0.3s', letterSpacing: '1px'
                      }}
                    >
                      {matchLoading ? 'Calculando...' : '💘 Matchear'}
                    </button>
                  </div>
                </div>
              )}

              {/* Resultados */}
              {matchResults && (() => {
                const menSummary = matchResults.summary.filter((s: any) => s.person.gender === 'Hombre');
                const womenSummary = matchResults.summary.filter((s: any) => s.person.gender === 'Mujer');
                const isHomoResults = isHomoEvent;

                const renderPersonCard = (item: any) => {
                  const hasMatch = item.matches.length > 0;
                  return (
                    <div key={item.person.id} style={{
                      padding: '1rem', borderRadius: '10px', marginBottom: '0.5rem',
                      background: hasMatch ? 'rgba(57,255,20,0.06)' : 'rgba(255,255,255,0.02)',
                      border: hasMatch ? '1px solid rgba(57,255,20,0.2)' : '1px solid rgba(255,255,255,0.06)',
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                        {item.person.firstName} {item.person.lastName}
                      </div>
                      {item.person.email && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: hasMatch ? '0.6rem' : 0 }}>
                          {item.person.email}
                        </div>
                      )}
                      {hasMatch ? (
                        <div>
                          {item.matches.map((m: any) => (
                            <div key={m.id} style={{
                              display: 'flex', alignItems: 'center', gap: '0.4rem',
                              padding: '0.35rem 0.6rem', marginTop: '0.3rem',
                              background: 'rgba(255,16,122,0.1)', borderRadius: '6px',
                              border: '1px solid rgba(255,16,122,0.2)',
                            }}>
                              <span style={{ fontSize: '0.75rem' }}>💘</span>
                              <span style={{ color: 'var(--neon-pink)', fontSize: '0.8rem', fontWeight: 600 }}>{m.firstName} {m.lastName}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.25rem', fontStyle: 'italic' }}>Sin match</div>
                      )}
                    </div>
                  );
                };

                return (
                  <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(57,255,20,0.2)' }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '1.5rem', background: matchResults.totalMatches > 0 ? 'rgba(57,255,20,0.05)' : 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{matchResults.totalMatches > 0 ? '🎉' : '😢'}</div>
                      <h3 style={{ color: matchResults.totalMatches > 0 ? 'var(--neon-green)' : 'var(--text-muted)', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                        {matchResults.totalMatches > 0 ? `${matchResults.totalMatches} Match${matchResults.totalMatches > 1 ? 'es' : ''} encontrado${matchResults.totalMatches > 1 ? 's' : ''}!` : 'No hubo matches esta vez'}
                      </h3>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '0.75rem' }}>
                        <div><span style={{ fontWeight: 'bold', color: 'var(--neon-green)', fontSize: '1.3rem' }}>{matchResults.summary.filter((s: any) => s.matches.length > 0).length}</span> <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>con match</span></div>
                        <div><span style={{ fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '1.3rem' }}>{matchResults.summary.filter((s: any) => s.matches.length === 0).length}</span> <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>sin match</span></div>
                      </div>
                    </div>

                    {/* Parejas match — vista rápida */}
                    {matchResults.totalMatches > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h4 style={{ color: 'var(--neon-pink)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>💘 Parejas Confirmadas</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {matchResults.matches.map((match: any, idx: number) => (
                            <div key={idx} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '10px',
                              background: 'rgba(57,255,20,0.06)', border: '1px solid rgba(57,255,20,0.15)',
                              flexWrap: 'wrap',
                            }}>
                              <div style={{ textAlign: 'right', flex: 1, minWidth: '120px' }}>
                                <div style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>{match.person1.firstName} {match.person1.lastName}</div>
                                {match.person1.email && <div style={{ fontSize: '0.7rem', color: 'var(--neon-cyan)' }}>{match.person1.email}</div>}
                              </div>
                              <div style={{ color: 'var(--neon-pink)', fontSize: '1.2rem', flexShrink: 0 }}>💘</div>
                              <div style={{ textAlign: 'left', flex: 1, minWidth: '120px' }}>
                                <div style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>{match.person2.firstName} {match.person2.lastName}</div>
                                {match.person2.email && <div style={{ fontSize: '0.7rem', color: 'var(--neon-cyan)' }}>{match.person2.email}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isHomoResults ? (
                      <div>
                        <div style={{ textAlign: 'center', marginBottom: '0.75rem', padding: '0.5rem', background: 'linear-gradient(90deg, rgba(255,0,0,0.08), rgba(255,165,0,0.08), rgba(255,255,0,0.08), rgba(0,200,0,0.08), rgba(0,100,255,0.08), rgba(150,0,255,0.08))', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', letterSpacing: '0.5px' }}>🏳️‍🌈 PARTICIPANTES</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                          {matchResults.summary.map((item: any) => renderPersonCard(item))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <div style={{ textAlign: 'center', marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(0,150,255,0.08)', borderRadius: '8px', border: '1px solid rgba(0,150,255,0.15)' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(100,180,255,1)', letterSpacing: '0.5px' }}>🙋‍♂️ HOMBRES</span>
                          </div>
                          {menSummary.map((item: any) => renderPersonCard(item))}
                        </div>
                        <div>
                          <div style={{ textAlign: 'center', marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(255,16,122,0.08)', borderRadius: '8px', border: '1px solid rgba(255,16,122,0.15)' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--neon-pink)', letterSpacing: '0.5px' }}>🙋‍♀️ MUJERES</span>
                          </div>
                          {womenSummary.map((item: any) => renderPersonCard(item))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* ─── TAB: TRAGOS ─── */}
        {activeTab === 'drinks' && (
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div className="glass-card" style={{ border: '1px solid rgba(255,16,122,0.2)', marginBottom: '1.5rem' }}>
              <h3 className="text-pink" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Catálogo de Tragos</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Agregá o eliminá tragos del catálogo global. Al crear un evento podrás seleccionar cuáles ofrecer.
              </p>

              {/* Agregar nuevo */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  className="input-field"
                  value={newDrinkName}
                  onChange={e => setNewDrinkName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDrink(); } }}
                  placeholder="Nombre del trago..."
                  style={{ flex: 1, minWidth: '180px', fontSize: '0.9rem', padding: '0.6rem 0.9rem' }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={newDrinkAlcoholic}
                    onChange={e => setNewDrinkAlcoholic(e.target.checked)}
                    style={{ accentColor: 'var(--neon-pink)', width: '1rem', height: '1rem' }}
                  />
                  Alcohólico
                </label>
                <button
                  type="button"
                  onClick={handleAddDrink}
                  disabled={drinksLoading || !newDrinkName.trim()}
                  style={{ background: 'rgba(255,16,122,0.15)', border: '1px solid rgba(255,16,122,0.4)', color: 'var(--neon-pink)', borderRadius: '8px', padding: '0.6rem 1.1rem', cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap', opacity: !newDrinkName.trim() ? 0.5 : 1 }}
                >
                  + Agregar
                </button>
              </div>

              {drinksLoading && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cargando...</p>}

              {/* Sin alcohol */}
              {drinkCatalog.filter(d => !d.isAlcoholic).length > 0 && (
                <>
                  <p style={{ color: 'var(--neon-cyan)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem', fontWeight: 600 }}>Sin Alcohol</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                    {drinkCatalog.filter(d => !d.isAlcoholic).map(drink => (
                      <div key={drink.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(57,255,20,0.05)', border: '1px solid rgba(57,255,20,0.15)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                        <span style={{ color: 'var(--neon-green)', fontSize: '0.9rem' }}>{drink.name}</span>
                        <button onClick={() => handleDeleteDrink(drink.id, drink.name)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 0.25rem' }} title="Eliminar">✕</button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Alcohólicas */}
              {drinkCatalog.filter(d => d.isAlcoholic).length > 0 && (
                <>
                  <p style={{ color: 'var(--neon-pink)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem', fontWeight: 600 }}>Alcohólicas</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {drinkCatalog.filter(d => d.isAlcoholic).map(drink => (
                      <div key={drink.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,16,122,0.05)', border: '1px solid rgba(255,16,122,0.15)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                        <span style={{ color: 'var(--neon-pink)', fontSize: '0.9rem' }}>{drink.name}</span>
                        <button onClick={() => handleDeleteDrink(drink.id, drink.name)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 0.25rem' }} title="Eliminar">✕</button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {drinkCatalog.length === 0 && !drinksLoading && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>No hay tragos en el catálogo todavía.</p>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: TATUADORES ─── */}
        {activeTab === 'tatuadores' && (
          <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Formulario agregar / editar */}
            <div className="glass-card" style={{ border: '1px solid rgba(0,255,255,0.2)' }}>
              <h3 className="text-cyan" style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>
                {tatEditId ? '✏️ Editar Tatuador' : '➕ Agregar Tatuador'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input className="input-field" placeholder="Nombre *" value={tatForm.name} onChange={e => setTatForm(f => ({ ...f, name: e.target.value }))} />
                <input className="input-field" placeholder="Especialidad * (ej: Blackwork · Fine Line)" value={tatForm.specialty} onChange={e => setTatForm(f => ({ ...f, specialty: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input className="input-field" placeholder="Teléfono WA * (ej: 59899123456)" value={tatForm.phone} onChange={e => setTatForm(f => ({ ...f, phone: e.target.value }))} />
                <input className="input-field" placeholder="Instagram (ej: @maikdart)" value={tatForm.instagram} onChange={e => setTatForm(f => ({ ...f, instagram: e.target.value }))} />
              </div>
              <textarea
                className="input-field"
                placeholder="Bio (descripción breve del artista...)"
                value={tatForm.bio}
                onChange={e => setTatForm(f => ({ ...f, bio: e.target.value }))}
                rows={3}
                style={{ marginBottom: '0.75rem', resize: 'vertical' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'center' }}>
                <input className="input-field" placeholder="URL foto (opcional)" value={tatForm.photoUrl} onChange={e => setTatForm(f => ({ ...f, photoUrl: e.target.value }))} />
                <input className="input-field" type="number" placeholder="Orden" value={tatForm.order} onChange={e => setTatForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} style={{ width: '90px' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                {tatEditId && (
                  <button onClick={() => { setTatEditId(null); setTatForm({ name: '', specialty: '', bio: '', phone: '', instagram: '', photoUrl: '', order: 0 }); }}
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: '8px', padding: '0.6rem 1.2rem', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                )}
                <button onClick={handleSaveTatuador} disabled={tatuadoresLoading}
                  style={{ background: 'rgba(0,255,255,0.12)', border: '1px solid rgba(0,255,255,0.4)', color: 'var(--neon-cyan)', borderRadius: '8px', padding: '0.6rem 1.4rem', cursor: 'pointer', fontWeight: 600 }}>
                  {tatEditId ? 'Guardar cambios' : '+ Agregar'}
                </button>
              </div>
            </div>

            {/* Lista de tatuadores */}
            <div className="glass-card" style={{ border: '1px solid rgba(255,16,122,0.2)' }}>
              <h3 className="text-pink" style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Artistas ({tatuadoresList.length})</h3>
              {tatuadoresLoading && <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>}
              {tatuadoresList.length === 0 && !tatuadoresLoading && (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No hay tatuadores agregados aún.</p>
              )}
              {tatuadoresList.map(tat => (
                <div key={tat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.9rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.2rem' }}>
                      <span style={{ color: 'white', fontWeight: 600 }}>{tat.name}</span>
                      {tat.instagram && <span className="text-cyan" style={{ fontSize: '0.8rem' }}>{tat.instagram}</span>}
                      <span style={{ fontSize: '0.75rem', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', color: '#25d366', borderRadius: '20px', padding: '0.1rem 0.5rem' }}>
                        {tat.contacts.length} consultas
                      </span>
                    </div>
                    <span style={{ color: 'var(--neon-pink)', fontSize: '0.78rem' }}>{tat.specialty}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => { setTatEditId(tat.id); setTatForm({ name: tat.name, specialty: tat.specialty, bio: tat.bio, phone: tat.phone, instagram: tat.instagram, photoUrl: tat.photoUrl, order: tat.order }); }}
                      style={{ background: 'rgba(0,255,255,0.08)', border: '1px solid rgba(0,255,255,0.2)', color: 'var(--neon-cyan)', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                      Editar
                    </button>
                    <button onClick={() => handleDeleteTatuador(tat.id, tat.name)}
                      style={{ background: 'rgba(255,16,122,0.08)', border: '1px solid rgba(255,16,122,0.2)', color: 'var(--neon-pink)', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB: CONTENIDO ─── */}
        {activeTab === 'contenido' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Contenido del Sitio</h3>

            {/* ── Horarios ── */}
            <div className="glass-card" style={{ border: '1px solid rgba(0,255,255,0.15)' }}>
              <h4 className="text-cyan" style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Horarios</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {DIAS.map(dia => (
                  <div key={dia} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ width: '90px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>{DIA_LABELS[dia]}</span>
                    {/* Toggle abierto/cerrado */}
                    <button
                      onClick={() => setHorarios(h => ({ ...h, [dia]: { ...h[dia], open: !h[dia].open } }))}
                      style={{
                        padding: '0.3rem 0.85rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                        background: horarios[dia].open ? 'rgba(57,255,20,0.15)' : 'rgba(255,16,122,0.15)',
                        color: horarios[dia].open ? '#39ff14' : 'var(--neon-pink)',
                        boxShadow: horarios[dia].open ? '0 0 8px rgba(57,255,20,0.3)' : '0 0 8px rgba(255,16,122,0.3)',
                      }}
                    >
                      {horarios[dia].open ? 'ABIERTO' : 'CERRADO'}
                    </button>
                    {horarios[dia].open && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                        <input
                          type="time"
                          className="input-field"
                          style={{ margin: 0, flex: 1, minWidth: 0 }}
                          value={horarios[dia].from}
                          onChange={e => setHorarios(h => ({ ...h, [dia]: { ...h[dia], from: e.target.value } }))}
                        />
                        <span style={{ color: 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>–</span>
                        <input
                          type="time"
                          className="input-field"
                          style={{ margin: 0, flex: 1, minWidth: 0 }}
                          value={horarios[dia].to}
                          onChange={e => setHorarios(h => ({ ...h, [dia]: { ...h[dia], to: e.target.value } }))}
                        />
                      </div>
                    )}
                    {!horarios[dia].open && <span style={{ flex: 1, fontSize: '0.85rem', color: 'rgba(255,255,255,0.2)' }}>—</span>}
                  </div>
                ))}
              </div>
              <button
                onClick={handleSaveHorarios}
                disabled={horariosLoading}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: 'rgba(0,255,255,0.1)', border: '1px solid rgba(0,255,255,0.4)',
                  color: 'var(--neon-cyan)', padding: '0.7rem 1.5rem', borderRadius: '10px',
                  cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '1px',
                  boxShadow: '0 0 12px rgba(0,255,255,0.15)', transition: 'all 0.2s',
                  opacity: horariosLoading ? 0.6 : 1,
                }}
                onMouseEnter={e => { if (!horariosLoading) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(0,255,255,0.4)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(0,255,255,0.15)'; }}
              >
                {horariosLoading ? '⏳ Guardando...' : '✓ Guardar Horarios'}
              </button>
            </div>

            {/* ── Carta / Menú ── */}
            <div className="glass-card" style={{ border: '1px solid rgba(0,255,255,0.15)' }}>
              <h4 className="text-cyan" style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
                {menuEditId ? 'Editar Ítem de Carta' : 'Agregar Ítem de Carta'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="input-label">Categoría</label>
                  <select className="input-field" value={menuForm.category} onChange={e => setMenuForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="cafe">Café</option>
                    <option value="comida">Comida</option>
                    <option value="tragos">Tragos</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Nombre *</label>
                  <input className="input-field" value={menuForm.name} onChange={e => setMenuForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Flat White" />
                </div>
                <div>
                  <label className="input-label">Precio (UYU) *</label>
                  <input className="input-field" type="number" value={menuForm.price} onChange={e => setMenuForm(f => ({ ...f, price: e.target.value }))} placeholder="Ej: 180" />
                </div>
                <div>
                  <label className="input-label">Descripción</label>
                  <input className="input-field" value={menuForm.description} onChange={e => setMenuForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción corta" />
                </div>
                <div>
                  <label className="input-label">URL de imagen</label>
                  <input className="input-field" value={menuForm.imageUrl} onChange={e => setMenuForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="/img/..." />
                </div>
                <div>
                  <label className="input-label">Orden</label>
                  <input className="input-field" type="number" value={menuForm.order} onChange={e => setMenuForm(f => ({ ...f, order: Number(e.target.value) }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={handleSaveMenuItem}
                  disabled={menuLoading || !menuForm.name.trim() || !menuForm.price}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: 'rgba(255,16,122,0.15)', border: '1px solid rgba(255,16,122,0.5)',
                    color: 'var(--neon-pink)', padding: '0.7rem 1.5rem', borderRadius: '10px',
                    cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '1px',
                    boxShadow: '0 0 12px rgba(255,16,122,0.2)', transition: 'all 0.2s',
                    opacity: (menuLoading || !menuForm.name.trim() || !menuForm.price) ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(255,16,122,0.5)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(255,16,122,0.2)'; }}
                >
                  {menuLoading ? '⏳ Guardando...' : menuEditId ? '✓ Actualizar' : '+ Agregar'}
                </button>
                {menuEditId && (
                  <button onClick={() => { setMenuEditId(null); setMenuForm({ category: 'cafe', name: '', description: '', price: '', imageUrl: '', order: 0 }); }}
                    style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', padding: '0.7rem 1.25rem', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* ── Lista de ítems ── */}
            {(['cafe', 'comida', 'tragos'] as const).map(cat => {
              const items = menuItems.filter(i => i.category === cat);
              if (items.length === 0) return null;
              const catLabel: Record<string, string> = { cafe: 'Café', comida: 'Comida', tragos: 'Tragos' };
              return (
                <div key={cat}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>{catLabel[cat]}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {items.map(item => (
                      <div key={item.id} className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{item.name}</div>
                          {item.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.description}</div>}
                        </div>
                        <div style={{ color: 'var(--neon-cyan)', fontWeight: 600, whiteSpace: 'nowrap' }}>${item.price}</div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => { setMenuEditId(item.id); setMenuForm({ category: item.category, name: item.name, description: item.description, price: String(item.price), imageUrl: item.imageUrl, order: item.order }); }}
                            style={{ background: 'rgba(0,255,255,0.1)', border: '1px solid rgba(0,255,255,0.2)', color: 'var(--neon-cyan)', padding: '0.3rem 0.7rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                            Editar
                          </button>
                          <button onClick={() => handleDeleteMenuItem(item.id)}
                            style={{ background: 'rgba(255,16,122,0.1)', border: '1px solid rgba(255,16,122,0.2)', color: 'var(--neon-pink)', padding: '0.3rem 0.7rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── TAB: CAMBIAR CONTRASEÑA ─── */}
        {activeTab === 'password' && (
          <div className="glass-card" style={{ border: '1px solid rgba(0,255,255,0.2)', maxWidth: '500px', margin: '0 auto' }}>
            <h3 className="text-cyan" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Cambiar Contraseña</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Actualizá la contraseña de acceso al panel de administración.</p>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="input-label">Contraseña Actual</label>
                <input
                  type="password"
                  className="input-field"
                  value={currentAdminPassword}
                  disabled
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'gray', marginTop: '0.3rem' }}>* Usando la contraseña de la sesión actual</p>
              </div>
              
              <div>
                <label className="input-label">Nueva Contraseña</label>
                <input
                  type="password"
                  className="input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="input-label">Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  className="input-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetir nueva contraseña"
                  required
                  minLength={6}
                />
              </div>

              <button type="submit" className="btn" style={{ background: 'var(--neon-cyan)', color: 'black', fontWeight: 'bold', marginTop: '1rem' }} disabled={loading}>
                {loading ? 'Guardando...' : 'Actualizar Contraseña'}
              </button>
            </form>

            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ color: 'var(--neon-cyan)', marginBottom: '1rem' }}>Notificaciones (Celular o PC)</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                Recibí avisos en este dispositivo cuando alguien se registre o pague un evento. Tenés que darle permisos al navegador si te lo pide.
              </p>
              <button 
                onClick={subscribeToPush} 
                disabled={loading}
                className="btn btn-outline" 
                style={{ width: '100%', borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)' }}
              >
                {loading ? 'Procesando...' : '🔔 Activar notificaciones acá'}
              </button>
            </div>
          </div>
        )}

        {/* ─── TAB: PARTICIPANTES ─── */}
        {activeTab === 'participants' && (() => {
          // Agrupar por instagram (o nombre si no tiene)
          const groups: Record<string, ParticipantGroup> = {};
          for (const reg of allRegistrations) {
            const key = reg.instagram?.toLowerCase() || `${reg.firstName}_${reg.lastName}`.toLowerCase();
            if (!groups[key]) {
              groups[key] = { key, instagram: reg.instagram || null, firstName: reg.firstName, lastName: reg.lastName, phone: reg.phone || null, registrations: [] };
            }
            groups[key].registrations.push(reg);
          }
          const allGroups = Object.values(groups).sort((a, b) =>
            `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
          );
          const search = participantsSearch.toLowerCase();
          const filtered = allGroups.filter(p =>
            !search ||
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(search) ||
            (p.instagram || '').toLowerCase().includes(search) ||
            (p.phone || '').includes(search)
          );
          const totalMatches = allGroups.reduce((acc, p) =>
            acc + p.registrations.reduce((a, r) => a + getMatchesForReg(r).length, 0), 0
          ) / 2;

          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Base de Participantes</h3>
                <button
                  onClick={loadParticipants}
                  disabled={participantsLoading}
                  style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-muted)', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {participantsLoading ? '⏳ Cargando...' : '🔄 Actualizar'}
                </button>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Participantes únicos', value: allGroups.length, color: 'var(--neon-cyan)' },
                  { label: 'Inscripciones totales', value: allRegistrations.length, color: 'white' },
                  { label: 'Pagados', value: allRegistrations.filter(r => r.paid).length, color: 'var(--neon-green)' },
                  { label: 'Asistieron', value: allRegistrations.filter(r => r.paid && r.attended !== false).length, color: 'rgba(100,180,255,1)' },
                  { label: 'Matches generados', value: Math.floor(totalMatches), color: 'var(--neon-pink)' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '0.25rem' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Buscador */}
              <div style={{ marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Buscar por nombre, Instagram o teléfono..."
                  value={participantsSearch}
                  onChange={e => setParticipantsSearch(e.target.value)}
                />
              </div>

              {participantsLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando participantes...</div>
              ) : filtered.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                  <p>{participantsSearch ? 'Sin resultados para esa búsqueda.' : 'Aún no hay participantes registrados.'}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {filtered.map(participant => {
                    const isExpanded = expandedParticipant === participant.key;
                    const totalMatchCount = participant.registrations.reduce((acc, r) => acc + getMatchesForReg(r).length, 0);
                    return (
                      <div key={participant.key} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
                        {/* Fila del participante */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '1rem 1.25rem', gap: '1rem' }}>
                          <div
                            onClick={() => setExpandedParticipant(isExpanded ? null : participant.key)}
                            style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', cursor: 'pointer' }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '1rem' }}>{participant.firstName} {participant.lastName}</div>
                              <div style={{ color: 'var(--neon-cyan)', fontSize: '0.85rem', marginTop: '0.15rem' }}>{participant.instagram || <span style={{ color: 'var(--text-muted)' }}>Sin Instagram</span>}</div>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>📱 {participant.phone || '—'}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              📅 {participant.registrations.length} evento{participant.registrations.length !== 1 ? 's' : ''}
                            </div>
                            {totalMatchCount > 0 && (
                              <span style={{ background: 'rgba(255,16,122,0.15)', color: 'var(--neon-pink)', border: '1px solid rgba(255,16,122,0.3)', borderRadius: '50px', padding: '0.1rem 0.6rem', fontSize: '0.8rem', fontWeight: 600 }}>
                                💘 {totalMatchCount} match{totalMatchCount !== 1 ? 'es' : ''}
                              </span>
                            )}
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{isExpanded ? '▲' : '▼'}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteParticipant(participant.registrations.map(r => r.id), `${participant.firstName} ${participant.lastName}`)}
                            title="Eliminar de la base de datos"
                            style={{ background: 'rgba(255,16,122,0.08)', border: '1px solid rgba(255,16,122,0.2)', color: 'var(--neon-pink)', padding: '0.4rem 0.7rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                          >
                            🗑️ Eliminar
                          </button>
                        </div>

                        {/* Detalle expandido */}
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {participant.registrations
                              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                              .map(reg => {
                                const matches = getMatchesForReg(reg);
                                const payLabel = reg.paymentMethod === 'mercadopago'
                                  ? '💳 MercadoPago'
                                  : reg.paymentMethod === 'transfer'
                                    ? '🏦 Transferencia'
                                    : '—';
                                const attended = reg.attended !== false;
                                return (
                                  <div key={reg.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                      <div>
                                        <div style={{ fontWeight: 600, color: 'white' }}>
                                          {reg.event?.type ?? reg.eventType ?? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Evento eliminado</span>}
                                          {!reg.event && (reg.eventType || reg.eventDate) && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>(eliminado)</span>}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                          {(reg.event?.date ?? reg.eventDate) ? format(new Date((reg.event?.date ?? reg.eventDate)!), "dd/MM/yyyy 'a las' HH:mm") + ' · ' : ''}Registrado el {format(new Date(reg.createdAt), "dd/MM/yyyy")}
                                        </div>
                                      </div>
                                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{ background: reg.paid ? 'rgba(57,255,20,0.1)' : 'rgba(255,16,122,0.1)', color: reg.paid ? 'var(--neon-green)' : 'var(--neon-pink)', border: `1px solid ${reg.paid ? 'rgba(57,255,20,0.2)' : 'rgba(255,16,122,0.2)'}`, borderRadius: '50px', padding: '0.15rem 0.6rem', fontSize: '0.75rem' }}>
                                          {reg.paid ? '✅ Pagado' : '⏳ Pendiente'}
                                        </span>
                                        <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', borderRadius: '50px', padding: '0.15rem 0.6rem', fontSize: '0.75rem' }}>
                                          {payLabel}
                                        </span>
                                        {reg.paid && (
                                          <span style={{ background: attended ? 'rgba(57,255,20,0.08)' : 'rgba(255,80,80,0.1)', color: attended ? 'var(--neon-green)' : '#ff8080', border: `1px solid ${attended ? 'rgba(57,255,20,0.2)' : 'rgba(255,80,80,0.25)'}`, borderRadius: '50px', padding: '0.15rem 0.6rem', fontSize: '0.75rem' }}>
                                            {attended ? '🎟️ Asistió' : '🚫 No asistió'}
                                          </span>
                                        )}
                                        <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', borderRadius: '50px', padding: '0.15rem 0.6rem', fontSize: '0.75rem' }}>
                                          {reg.gender === 'Hombre' ? '👨 Hombre' : '👩 Mujer'}
                                        </span>
                                      </div>
                                    </div>

                                    {!reg.paid && (
                                      <div style={{ marginBottom: matches.length > 0 ? '0.75rem' : 0 }}>
                                        <button
                                          onClick={async () => { await handleMarkAsPaid(reg.id, `${reg.firstName} ${reg.lastName}`); await loadParticipants(); }}
                                          style={{ background: 'rgba(57,255,20,0.1)', border: '1px solid rgba(57,255,20,0.3)', color: 'var(--neon-green)', padding: '0.35rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                                        >
                                          ✅ Marcar como pagado
                                        </button>
                                      </div>
                                    )}
                                    {matches.length > 0 ? (
                                      <div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--neon-pink)', textTransform: 'uppercase', marginBottom: '0.4rem', fontWeight: 600 }}>💘 Matches en este evento</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                          {matches.map(m => (
                                            <div key={m.id} style={{ background: 'rgba(255,16,122,0.08)', border: '1px solid rgba(255,16,122,0.2)', borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                                              <div style={{ fontWeight: 600 }}>{m.firstName} {m.lastName}</div>
                                              {m.instagram && <div style={{ color: 'var(--neon-cyan)', fontSize: '0.75rem' }}>{m.instagram}</div>}
                                              {m.phone && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>📱 {m.phone}</div>}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin matches en este evento.</div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Modal: Agregar participante manualmente ── */}
      {addParticipantEventId && (() => {
        const ev = eventList.find(e => e.id === addParticipantEventId);
        if (!ev) return null;
        const evDrinks = (ev.drinksAvailable || '').split(',').map(d => d.trim()).filter(Boolean);
        return (
          <div
            onClick={() => setAddParticipantEventId(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem' }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: '#0d0d0d', border: '1px solid rgba(57,255,20,0.3)', borderRadius: '12px', padding: '2rem', maxWidth: '780px', width: '100%', boxShadow: '0 0 30px rgba(57,255,20,0.15)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem', color: 'var(--neon-green)', marginBottom: '0.3rem' }}>➕ Agregar Participante</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{ev.type} — {format(new Date(ev.date), "dd 'de' MMMM, HH:mm 'hs'", { locale: es })}</p>
                </div>
                <button onClick={() => setAddParticipantEventId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input className="input-field" placeholder="Nombre" value={addPartForm.firstName} onChange={e => setAddPartForm(f => ({ ...f, firstName: e.target.value }))} />
                <input className="input-field" placeholder="Apellido" value={addPartForm.lastName} onChange={e => setAddPartForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: evDrinks.length > 0 ? '1fr 1fr' : '1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <select className="input-field" value={addPartForm.gender} onChange={e => setAddPartForm(f => ({ ...f, gender: e.target.value as 'Hombre' | 'Mujer' }))}>
                  <option value="Hombre">Hombre</option>
                  <option value="Mujer">Mujer</option>
                </select>
                {evDrinks.length > 0 && (
                  <select className="input-field" value={addPartForm.selectedDrink} onChange={e => setAddPartForm(f => ({ ...f, selectedDrink: e.target.value }))}>
                    <option value="">Sin trago / elegir luego</option>
                    {evDrinks.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input className="input-field" placeholder="Instagram (@usuario)" value={addPartForm.instagram} onChange={e => setAddPartForm(f => ({ ...f, instagram: e.target.value }))} />
                <input className="input-field" placeholder="Teléfono (+598...)" value={addPartForm.phone} onChange={e => setAddPartForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <input className="input-field" placeholder="Email (opcional)" value={addPartForm.email} onChange={e => setAddPartForm(f => ({ ...f, email: e.target.value }))} style={{ marginBottom: '0.75rem' }} />

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={addPartForm.markAsPaid} onChange={e => setAddPartForm(f => ({ ...f, markAsPaid: e.target.checked }))} />
                Marcar como pagado (invitación de la casa)
              </label>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
                ℹ️ Aplica el control de cupos del evento. No envía notificaciones automáticas al participante.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setAddParticipantEventId(null)} className="btn btn-outline" style={{ padding: '0.6rem 1.2rem' }}>Cancelar</button>
                <button onClick={handleAddParticipant} disabled={addPartLoading} className="btn btn-primary" style={{ padding: '0.6rem 1.2rem' }}>
                  {addPartLoading ? 'Agregando...' : '➕ Agregar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
