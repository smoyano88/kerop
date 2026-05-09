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
    groupNumber?: number | null;
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
  groupNumber?: number | null;
  archived?: boolean;
  registrations: Registration[];
  matchData?: { id: string; selections: Record<string, string[]> } | null;
}

export default function AdminClient({ events }: { events: Event[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [eventList, setEventList] = useState<Event[]>(events);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'events' | 'create' | 'matches' | 'participants' | 'historico' | 'drinks' | 'tatuadores' | 'contenido' | 'password'>('events');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallTip, setShowInstallTip] = useState(false);
  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') { setInstallPrompt(null); setIsInstalled(true); }
    } else {
      setShowInstallTip(true);
    }
  };

  // Tatuadores State
  interface TatuadorAdmin { id: string; name: string; specialty: string; bio: string; phone: string; instagram: string; photoUrl: string; gallery: string[]; order: number; active: boolean; contacts: { id: string; createdAt: string }[]; }
  const [tatuadoresList, setTatuadoresList] = useState<TatuadorAdmin[]>([]);
  const [tatuadoresLoading, setTatuadoresLoading] = useState(false);
  const [tatForm, setTatForm] = useState({ name: '', specialty: '', bio: '', phone: '', instagram: '', photoUrl: '', gallery: [] as string[], order: 0 });
  const [tatEditId, setTatEditId] = useState<string | null>(null);
  const [tatPhotoUploading, setTatPhotoUploading] = useState(false);
  const [tatGalleryUploading, setTatGalleryUploading] = useState(false);
  const tatPhotoRef = useRef<HTMLInputElement>(null);
  const tatGalleryRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('password', currentAdminPassword);
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error subiendo archivo');
    return data.url as string;
  };

  const handleTatPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setTatPhotoUploading(true);
    try {
      const url = await uploadFile(file);
      setTatForm(f => ({ ...f, photoUrl: url }));
    } catch { setError('Error subiendo foto de perfil'); }
    finally { setTatPhotoUploading(false); e.target.value = ''; }
  };

  const handleTatGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setTatGalleryUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadFile));
      setTatForm(f => ({ ...f, gallery: [...f.gallery, ...urls] }));
    } catch { setError('Error subiendo fotos de galería'); }
    finally { setTatGalleryUploading(false); e.target.value = ''; }
  };

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
  const [menuForm, setMenuForm] = useState({ category: 'alfajor', name: '', description: '', price: '', imageUrl: '', order: 0 });
  const [menuEditId, setMenuEditId] = useState<string | null>(null);
  const [menuImgUploading, setMenuImgUploading] = useState(false);
  const menuImgRef = useRef<HTMLInputElement>(null);

  const handleMenuImgSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setMenuImgUploading(true);
    try {
      const url = await uploadFile(file);
      setMenuForm(f => ({ ...f, imageUrl: url }));
    } catch { setError('Error subiendo imagen'); }
    finally { setMenuImgUploading(false); e.target.value = ''; }
  };

  // Helper: formatear input de hora → insertar : automáticamente
  const formatTimeInput = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  };

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
      showSuccess('✅ Horarios actualizados');
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
      showSuccess(menuEditId ? '✅ Ítem actualizado' : '✅ Ítem agregado');
    } catch { setError('Error guardando ítem'); } finally { setMenuLoading(false); }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm('¿Eliminar este ítem?')) return;
    try {
      await fetch('/api/menu-items', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, password: currentAdminPassword }) });
      await loadContenido();
    } catch { setError('Error eliminando ítem'); }
  };

  // Scan cuaderno state
  interface ScannedParticipante { firstName: string; lastName: string; gender: 'Hombre' | 'Mujer'; phone: string | null; selectedDrink: string; age: number | null; grupos: number[]; }
  interface ScannedEvento { groupNumber: number; ageRange: string; date: string; type: string; }
  const [scanOpen, setScanOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{ participantes: ScannedParticipante[]; eventosDetectados: ScannedEvento[] } | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const handleScanImage = async (file: File) => {
    setScanLoading(true);
    setScanResult(null);
    try {
      const formData = new FormData();
      formData.append('password', currentAdminPassword);
      formData.append('image', file);
      const res = await fetch('/api/scan-cuaderno', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setScanResult(data);
    } catch { setError('Error procesando imagen'); } finally { setScanLoading(false); }
  };

  const handleImport = async () => {
    if (!scanResult) return;
    setImportLoading(true);
    try {
      const res = await fetch('/api/import-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: currentAdminPassword, ...scanResult }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      showSuccess(`✅ Importados ${data.created} registros en ${data.groups} grupos`);
      setScanResult(null);
      setScanOpen(false);
      await loadParticipants();
    } catch { setError('Error importando'); } finally { setImportLoading(false); }
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
    if ((activeTab === 'participants' || activeTab === 'historico') && isAuthenticated && allRegistrations.length === 0 && !participantsLoading) {
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

  /* ── Histórico State ── */
  const [historicoSearch, setHistoricoSearch] = useState('');
  const [historialSubtab, setHistorialSubtab] = useState<'eventos' | 'participantes'>('eventos');

  /* ── Wipe DB State ── */
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [wipePasswordInput, setWipePasswordInput] = useState('');
  const [wipeLoading, setWipeLoading] = useState(false);

  const handleWipeDatabase = async () => {
    if (wipeConfirmText !== 'BORRAR TODO') {
      setError('Tenés que escribir exactamente: BORRAR TODO');
      return;
    }
    if (!wipePasswordInput) {
      setError('Reingresá la contraseña de admin para confirmar');
      return;
    }
    setWipeLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/wipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: wipePasswordInput, confirm: wipeConfirmText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al limpiar base de datos');
      } else {
        showSuccess(`✅ Base limpiada. Eliminados: ${data.deleted.events} eventos, ${data.deleted.registrations} registros, ${data.deleted.matchData} matches.`);
        setWipeConfirmText('');
        setWipePasswordInput('');
        await reloadEvents();
      }
    } catch {
      setError('Error al limpiar base de datos');
    } finally {
      setWipeLoading(false);
    }
  };

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
      setTatForm({ name: '', specialty: '', bio: '', phone: '', instagram: '', photoUrl: '', gallery: [], order: 0 });
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
      groupNumber: formData.get('groupNumber') || null,
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
          <div className={`admin-nav-item ${activeTab === 'participants' || activeTab === 'historico' ? 'active' : ''}`} onClick={() => { setActiveTab(historialSubtab === 'participantes' ? 'participants' : 'historico'); loadParticipants(); }}>
            <span className="admin-nav-icon">📚</span>
            <span className="admin-nav-label">Historial</span>
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
            <span className="admin-nav-label">Configuración</span>
          </div>
          {!isInstalled && (
            <div className="admin-nav-item" onClick={handleInstall} style={{ marginTop: 'auto' }}>
              <span className="admin-nav-icon">📲</span>
              <span className="admin-nav-label">Instalar app</span>
            </div>
          )}
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
          <div className={`admin-mobile-nav-item ${activeTab === 'participants' || activeTab === 'historico' ? 'active' : ''}`} onClick={() => { setActiveTab(historialSubtab === 'participantes' ? 'participants' : 'historico'); loadParticipants(); }}>
            <span className="admin-nav-icon">📚</span>
            <span>Historial</span>
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
            <span className="admin-nav-icon">⚙️</span>
            <span>Config</span>
          </div>
          {!isInstalled && (
            <div className="admin-mobile-nav-item" onClick={handleInstall}>
              <span className="admin-nav-icon">📲</span>
              <span>Instalar</span>
            </div>
          )}
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
              }}>{eventList.filter(ev => !ev.archived && new Date(ev.date) >= new Date()).length}</span>
              <button
                onClick={() => reloadEvents()}
                style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-muted)', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}
                title="Actualizar lista"
              >
                🔄 Actualizar
              </button>
            </div>

            {eventList.filter(ev => !ev.archived && new Date(ev.date) >= new Date()).length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                <p>No hay eventos futuros. Usá "Agregar Evento" para crear el primero.</p>
                <button onClick={() => setActiveTab('create')} className="btn btn-outline" style={{ marginTop: '1.5rem', padding: '0.5rem 1.5rem' }}>+ Agregar Evento</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {eventList.filter(ev => !ev.archived && new Date(ev.date) >= new Date()).map((ev) => {
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                            <h4 style={{ fontSize: '1.3rem', margin: 0 }}>{ev.type}</h4>
                            {ev.groupNumber != null && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--neon-cyan)', background: 'rgba(0,255,255,0.08)', border: '1px solid rgba(0,255,255,0.3)', padding: '0.15rem 0.5rem', borderRadius: '999px', letterSpacing: '0.5px' }}>
                                G{ev.groupNumber}
                              </span>
                            )}
                          </div>
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

                      {total > 0 && isExpanded && (() => {
                        const identityOf = (r: { instagram?: string | null; firstName: string; lastName: string }) =>
                          r.instagram ? r.instagram.toLowerCase().replace('@', '').trim() : `${r.firstName}_${r.lastName}`.toLowerCase().trim();
                        const currentIdentities = new Set(ev.registrations.map(identityOf));
                        return (
                          <>
                            {/* Desktop: tabla */}
                            <div className="reg-table-desktop" style={{ width: '100%', borderRadius: '10px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.2)' }}>
                              <table style={{ minWidth: '600px', width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                  <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, width: '32px' }}>#</th>
                                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Nombre</th>
                                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>G</th>
                                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Trago</th>
                                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Registrado</th>
                                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500, width: '110px' }}>Pago</th>
                                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500, width: '60px' }}>⚡</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ev.registrations.map((reg, idx) => {
                                    const allPriorPartners = repeatedMatchData[ev.id]?.[reg.id] || [];
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
                                      <td style={{ padding: '0.6rem 0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }} title={reg.selectedDrink}>
                                        <span style={{ background: drinkCatalog.find(d => d.name === reg.selectedDrink)?.isAlcoholic ? 'rgba(255,16,122,0.1)' : 'rgba(57,255,20,0.1)', color: drinkCatalog.find(d => d.name === reg.selectedDrink)?.isAlcoholic ? 'var(--neon-pink)' : 'var(--neon-green)', padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.75rem', border: `1px solid ${drinkCatalog.find(d => d.name === reg.selectedDrink)?.isAlcoholic ? 'rgba(255,16,122,0.2)' : 'rgba(57,255,20,0.2)'}` }}>
                                          {reg.selectedDrink}
                                        </span>
                                      </td>
                                      <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{format(new Date(reg.createdAt), "dd/MM HH:mm")}</td>
                                      <td style={{ padding: '0.4rem 0.8rem', textAlign: 'center' }}>
                                        {reg.paid
                                          ? <span style={{ background: 'rgba(57,255,20,0.1)', color: 'var(--neon-green)', padding: '0.15rem 0.5rem', borderRadius: '50px', fontSize: '0.75rem', border: '1px solid rgba(57,255,20,0.2)', whiteSpace: 'nowrap' }}>✅ Pagado</span>
                                          : <span style={{ background: 'rgba(255,16,122,0.1)', color: 'var(--neon-pink)', padding: '0.15rem 0.5rem', borderRadius: '50px', fontSize: '0.75rem', border: '1px solid rgba(255,16,122,0.2)', whiteSpace: 'nowrap' }}>⏳ Pendiente</span>
                                        }
                                      </td>
                                      <td style={{ padding: '0.4rem 0.8rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                          {!reg.paid && reg.paymentMethod === 'transfer' && (
                                            <button onClick={() => handleMarkAsPaid(reg.id, reg.firstName)} style={{ background: 'rgba(57,255,20,0.15)', color: 'var(--neon-green)', border: '1px solid rgba(57,255,20,0.4)', borderRadius: '6px', fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap' }} title="Confirmar pago por transferencia">💰</button>
                                          )}
                                          <button onClick={() => handleDeleteRegistration(reg.id, `${reg.firstName} ${reg.lastName}`)} style={{ background: 'none', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.7 }} title="Eliminar inscripto" onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}>🗑️</button>
                                        </div>
                                      </td>
                                    </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile: cards */}
                            <div className="reg-cards-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                              {ev.registrations.map((reg, idx) => {
                                const allPriorPartners = repeatedMatchData[ev.id]?.[reg.id] || [];
                                const priorMatchHere = allPriorPartners.filter(p => currentIdentities.has(identityOf(p)));
                                const hasPriorMatch = priorMatchHere.length > 0;
                                const isAlco = drinkCatalog.find(d => d.name === reg.selectedDrink)?.isAlcoholic;
                                return (
                                  <div key={reg.id} style={{ background: hasPriorMatch ? 'rgba(255,221,0,0.1)' : 'rgba(255,255,255,0.03)', border: hasPriorMatch ? '1px solid rgba(255,221,0,0.35)' : '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '0.75rem 1rem', boxShadow: hasPriorMatch ? 'inset 3px 0 0 #ffdd00' : undefined }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: hasPriorMatch ? 'var(--neon-pink)' : 'white' }}>
                                        {idx + 1}. {reg.firstName} {reg.lastName}
                                        {hasPriorMatch && <span style={{ marginLeft: '0.4rem' }}>💞</span>}
                                      </div>
                                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        {!reg.paid && reg.paymentMethod === 'transfer' && (
                                          <button onClick={() => handleMarkAsPaid(reg.id, reg.firstName)} style={{ background: 'rgba(57,255,20,0.15)', color: 'var(--neon-green)', border: '1px solid rgba(57,255,20,0.4)', borderRadius: '6px', fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>💰 Pagó</button>
                                        )}
                                        <button onClick={() => handleDeleteRegistration(reg.id, `${reg.firstName} ${reg.lastName}`)} style={{ background: 'none', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', fontSize: '1rem' }}>🗑️</button>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{reg.gender === 'Hombre' ? '👨' : '👩'} {reg.gender}</span>
                                      <span style={{ background: isAlco ? 'rgba(255,16,122,0.1)' : 'rgba(57,255,20,0.1)', color: isAlco ? 'var(--neon-pink)' : 'var(--neon-green)', padding: '0.1rem 0.5rem', borderRadius: '50px', fontSize: '0.75rem', border: `1px solid ${isAlco ? 'rgba(255,16,122,0.2)' : 'rgba(57,255,20,0.2)'}` }}>
                                        {reg.selectedDrink || '—'}
                                      </span>
                                      {reg.paid
                                        ? <span style={{ background: 'rgba(57,255,20,0.1)', color: 'var(--neon-green)', padding: '0.1rem 0.5rem', borderRadius: '50px', fontSize: '0.75rem', border: '1px solid rgba(57,255,20,0.2)' }}>✅ Pagado</span>
                                        : <span style={{ background: 'rgba(255,16,122,0.1)', color: 'var(--neon-pink)', padding: '0.1rem 0.5rem', borderRadius: '50px', fontSize: '0.75rem', border: '1px solid rgba(255,16,122,0.2)' }}>⏳ Pendiente</span>
                                      }
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{format(new Date(reg.createdAt), "dd/MM HH:mm")}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
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

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="input-label">N° de Grupo (cuaderno)</label>
                  <input
                    type="number"
                    name="groupNumber"
                    className="input-field"
                    placeholder="Se asigna automáticamente"
                    min="1"
                  />
                  <p style={{ color: 'gray', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                    Opcional. Si no se ingresa se asigna el siguiente número automáticamente.
                  </p>
                </div>
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
            if (ev.archived) return false;
            const isHomo = ev.type === 'Ellos y Ellos' || ev.type === 'Ellas y Ellas';
            const totalSpots = isHomo ? ev.spotsPerGender : ev.spotsPerGender * 2;
            const paidCount = ev.registrations.filter(r => r.paid).length;
            return paidCount >= totalSpots;
          });

          // Eventos archivados sin MatchData cargado
          const archivedWithoutMatches = eventList.filter(ev => ev.archived && !ev.matchData);

          const selectedEvent = matchEventId ? eventList.find(e => e.id === matchEventId) : null;
          const isArchivedEvent = selectedEvent?.archived ?? false;
          // Para archivados usamos todos los registros; para activos solo los pagos
          const paidRegs = selectedEvent
            ? (isArchivedEvent ? selectedEvent.registrations : selectedEvent.registrations.filter(r => r.paid))
            : [];
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <h4 style={{ color: 'var(--neon-pink)', margin: 0, fontSize: '1.1rem' }}>{title}</h4>
                <span className="matrix-scroll-hint" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'none' }}>← deslizá →</span>
              </div>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${colParticipants.length * 80 + 150}px` }}>
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

              {/* Selector de evento activo */}
              <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                <label className="input-label">Evento activo</label>
                {fullEvents.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>No hay eventos con cupo completo todavía. Los eventos aparecen acá cuando todos los cupos están pagados.</p>
                ) : (
                  <select
                    className="input-field"
                    value={matchEventId && !selectedEvent?.archived ? matchEventId : ''}
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

              {/* Eventos pasados sin matches */}
              {archivedWithoutMatches.length > 0 && (
                <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid rgba(255,200,0,0.2)' }}>
                  <label className="input-label" style={{ color: '#f0b429' }}>📋 Eventos pasados sin matches cargados</label>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.5rem 0 1rem' }}>
                    Estos grupos ya tienen participantes pero todavía no cargaste los matches. Seleccioná uno para cargarlos.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {archivedWithoutMatches.map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => handleLoadSelections(ev.id)}
                        style={{
                          background: matchEventId === ev.id ? 'rgba(255,200,0,0.15)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${matchEventId === ev.id ? 'rgba(255,200,0,0.5)' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: '10px', padding: '0.75rem 1rem', cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          color: 'white', textAlign: 'left', transition: 'all 0.15s',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                            {ev.groupNumber ? `Grupo ${ev.groupNumber}` : ev.type}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                            {format(new Date(ev.date), "dd/MM/yyyy", { locale: es })} · {ev.registrations.length} participantes
                          </div>
                        </div>
                        <span style={{ color: '#f0b429', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {matchEventId === ev.id ? 'Seleccionado ✓' : 'Cargar →'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matrices */}
              {selectedEvent && (
                <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1.2rem', color: 'white' }}>
                        {selectedEvent.groupNumber ? `Grupo ${selectedEvent.groupNumber} — ${selectedEvent.type}` : selectedEvent.type}
                        {isArchivedEvent && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: 'rgba(255,200,0,0.15)', color: '#f0b429', border: '1px solid rgba(255,200,0,0.3)', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>Pasado</span>}
                      </h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {format(new Date(selectedEvent.date), "EEEE d 'de' MMMM yyyy", { locale: es })} • {paidRegs.length} participantes{isArchivedEvent ? '' : ' pagados'}
                      </p>
                    </div>
                  </div>

                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                    {isArchivedEvent
                      ? '📋 Cargá los matches de este evento pasado. Tildá a quién eligió cada participante según las planillas del evento. Una vez que hagas click en "Calcular Matches" quedan guardados en el historial.'
                      : <>📋 Leé la planilla de cada participante y tildá a quién le puso match. Tocá el <span style={{ color: 'var(--neon-green)' }}>✓</span> para marcar a alguien que no asistió (queda gris). <span style={{ color: 'var(--neon-green)' }}>💾 Los cambios se guardan automáticamente.</span></>
                    }
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
                      <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input className="input-field" placeholder="Nombre *" value={tatForm.name} onChange={e => setTatForm(f => ({ ...f, name: e.target.value }))} />
                <input className="input-field" placeholder="Especialidad * (ej: Blackwork · Fine Line)" value={tatForm.specialty} onChange={e => setTatForm(f => ({ ...f, specialty: e.target.value }))} />
              </div>
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input className="input-field" placeholder="Teléfono WA * (ej: 59899123456)" value={tatForm.phone} onChange={e => setTatForm(f => ({ ...f, phone: e.target.value }))} />
                <input className="input-field" placeholder="Instagram (ej: @maikdart)" value={tatForm.instagram} onChange={e => setTatForm(f => ({ ...f, instagram: e.target.value }))} />
              </div>
              <textarea
                className="input-field"
                placeholder="Bio (descripción breve del artista...)"
                value={tatForm.bio}
                onChange={e => setTatForm(f => ({ ...f, bio: e.target.value }))}
                rows={3}
                style={{ marginBottom: '1rem', resize: 'vertical' }}
              />

              {/* Foto de perfil */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="input-label">Foto de perfil</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {tatForm.photoUrl && (
                    <div style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(0,255,255,0.4)', flexShrink: 0 }}>
                      <img src={tatForm.photoUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => setTatForm(f => ({ ...f, photoUrl: '' }))} style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => tatPhotoRef.current?.click()}
                    disabled={tatPhotoUploading}
                    style={{ background: 'rgba(0,255,255,0.1)', border: '1px solid rgba(0,255,255,0.3)', color: 'var(--neon-cyan)', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: tatPhotoUploading ? 0.6 : 1 }}
                  >
                    {tatPhotoUploading ? '⏳ Subiendo...' : '📷 Elegir foto'}
                  </button>
                  <input ref={tatPhotoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleTatPhotoSelect} />
                  {!tatForm.photoUrl && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin foto aún</span>}
                </div>
              </div>

              {/* Galería */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="input-label">Galería de trabajos</label>
                {tatForm.gallery.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    {tatForm.gallery.map((url, i) => (
                      <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img src={url} alt={`galería ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => setTatForm(f => ({ ...f, gallery: f.gallery.filter((_, j) => j !== i) }))} style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(0,0,0,0.75)', border: 'none', color: 'white', width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => tatGalleryRef.current?.click()}
                  disabled={tatGalleryUploading}
                  style={{ background: 'rgba(0,255,255,0.08)', border: '1px solid rgba(0,255,255,0.25)', color: 'var(--neon-cyan)', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: tatGalleryUploading ? 0.6 : 1 }}
                >
                  {tatGalleryUploading ? '⏳ Subiendo...' : '🖼️ Agregar fotos a galería'}
                </button>
                <input ref={tatGalleryRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleTatGallerySelect} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.4rem' }}>Podés seleccionar varias fotos a la vez. Se muestran en el portfolio público.</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label className="input-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Orden:</label>
                  <input className="input-field" type="number" value={tatForm.order} onChange={e => setTatForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} style={{ width: '80px', margin: 0 }} />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {tatEditId && (
                    <button onClick={() => { setTatEditId(null); setTatForm({ name: '', specialty: '', bio: '', phone: '', instagram: '', photoUrl: '', gallery: [], order: 0 }); }}
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: '8px', padding: '0.6rem 1.2rem', cursor: 'pointer' }}>
                      Cancelar
                    </button>
                  )}
                  <button onClick={handleSaveTatuador} disabled={tatuadoresLoading || tatPhotoUploading || tatGalleryUploading}
                    style={{ background: 'rgba(0,255,255,0.12)', border: '1px solid rgba(0,255,255,0.4)', color: 'var(--neon-cyan)', borderRadius: '8px', padding: '0.6rem 1.4rem', cursor: 'pointer', fontWeight: 600 }}>
                    {tatuadoresLoading ? '⏳ Guardando...' : tatEditId ? 'Guardar cambios' : '+ Agregar'}
                  </button>
                </div>
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
                <div key={tat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.9rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    {tat.photoUrl && (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(0,255,255,0.3)', flexShrink: 0 }}>
                        <img src={tat.photoUrl} alt={tat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                        <span style={{ color: 'white', fontWeight: 600 }}>{tat.name}</span>
                        {tat.instagram && <span className="text-cyan" style={{ fontSize: '0.8rem' }}>{tat.instagram}</span>}
                        <span style={{ fontSize: '0.75rem', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', color: '#25d366', borderRadius: '20px', padding: '0.1rem 0.5rem' }}>
                          {tat.contacts.length} consultas
                        </span>
                        {tat.gallery.length > 0 && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', borderRadius: '20px', padding: '0.1rem 0.5rem' }}>
                            🖼️ {tat.gallery.length} fotos
                          </span>
                        )}
                      </div>
                      <span style={{ color: 'var(--neon-pink)', fontSize: '0.78rem' }}>{tat.specialty}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => { setTatEditId(tat.id); setTatForm({ name: tat.name, specialty: tat.specialty, bio: tat.bio, phone: tat.phone, instagram: tat.instagram, photoUrl: tat.photoUrl, gallery: tat.gallery, order: tat.order }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
              <h4 className="text-cyan" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Horarios</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Escribí solo los números — el ":" se agrega solo. Ej: escribís 0900 y queda 09:00.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {DIAS.map(dia => (
                  <div key={dia} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap' }}>
                    <span style={{ width: '90px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0 }}>{DIA_LABELS[dia]}</span>
                    <button
                      onClick={() => setHorarios(h => ({ ...h, [dia]: { ...h[dia], open: !h[dia].open } }))}
                      style={{
                        padding: '0.3rem 0.85rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.2s', flexShrink: 0,
                        background: horarios[dia].open ? 'rgba(57,255,20,0.15)' : 'rgba(255,16,122,0.15)',
                        color: horarios[dia].open ? '#39ff14' : 'var(--neon-pink)',
                        boxShadow: horarios[dia].open ? '0 0 8px rgba(57,255,20,0.3)' : '0 0 8px rgba(255,16,122,0.3)',
                      }}
                    >
                      {horarios[dia].open ? 'ABIERTO' : 'CERRADO'}
                    </button>
                    {horarios[dia].open && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '160px' }}>
                        <input
                          className="input-field"
                          inputMode="numeric"
                          style={{ margin: 0, flex: 1, minWidth: 0, textAlign: 'center', letterSpacing: '2px' }}
                          value={horarios[dia].from}
                          onChange={e => setHorarios(h => ({ ...h, [dia]: { ...h[dia], from: formatTimeInput(e.target.value) } }))}
                          placeholder="09:00"
                          maxLength={5}
                        />
                        <span style={{ color: 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>–</span>
                        <input
                          className="input-field"
                          inputMode="numeric"
                          style={{ margin: 0, flex: 1, minWidth: 0, textAlign: 'center', letterSpacing: '2px' }}
                          value={horarios[dia].to}
                          onChange={e => setHorarios(h => ({ ...h, [dia]: { ...h[dia], to: formatTimeInput(e.target.value) } }))}
                          placeholder="22:00"
                          maxLength={5}
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
                    <option value="alfajor">🍫 Alfajor</option>
                    <option value="vegano">🌿 Vegano</option>
                    <option value="no_vegano">🥪 No Vegano</option>
                    <option value="bebida">☕ Bebida</option>
                    <option value="trago">🍹 Trago</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Nombre *</label>
                  <input className="input-field" value={menuForm.name} onChange={e => setMenuForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Banana Split" />
                </div>
                <div>
                  <label className="input-label">Precio (UYU) *</label>
                  <input className="input-field" type="number" value={menuForm.price} onChange={e => setMenuForm(f => ({ ...f, price: e.target.value }))} placeholder="Ej: 180" />
                </div>
                <div>
                  <label className="input-label">Descripción</label>
                  <input className="input-field" value={menuForm.description} onChange={e => setMenuForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción corta del producto" />
                </div>
                <div>
                  <label className="input-label">Orden</label>
                  <input className="input-field" type="number" value={menuForm.order} onChange={e => setMenuForm(f => ({ ...f, order: Number(e.target.value) }))} />
                </div>
              </div>

              {/* Upload imagen menú */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="input-label">Foto del producto</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {menuForm.imageUrl && (
                    <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }}>
                      <img src={menuForm.imageUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => setMenuForm(f => ({ ...f, imageUrl: '' }))} style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => menuImgRef.current?.click()}
                    disabled={menuImgUploading}
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-muted)', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: menuImgUploading ? 0.6 : 1 }}
                  >
                    {menuImgUploading ? '⏳ Subiendo...' : '📷 Elegir imagen'}
                  </button>
                  <input ref={menuImgRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleMenuImgSelect} />
                  {!menuForm.imageUrl && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin imagen</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={handleSaveMenuItem}
                  disabled={menuLoading || menuImgUploading || !menuForm.name.trim()}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: 'rgba(255,16,122,0.15)', border: '1px solid rgba(255,16,122,0.5)',
                    color: 'var(--neon-pink)', padding: '0.7rem 1.5rem', borderRadius: '10px',
                    cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
                    opacity: (menuLoading || menuImgUploading || !menuForm.name.trim()) ? 0.5 : 1,
                  }}
                >
                  {menuLoading ? '⏳ Guardando...' : menuEditId ? '✓ Actualizar' : '+ Agregar'}
                </button>
                {menuEditId && (
                  <button onClick={() => { setMenuEditId(null); setMenuForm({ category: 'alfajor', name: '', description: '', price: '', imageUrl: '', order: 0 }); }}
                    style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', padding: '0.7rem 1.25rem', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* ── Lista de ítems por categoría ── */}
            {(['alfajor', 'vegano', 'no_vegano', 'bebida', 'trago'] as const).map(cat => {
              const items = menuItems.filter(i => i.category === cat);
              if (items.length === 0) return null;
              const catLabel: Record<string, string> = { alfajor: '🍫 Alfajores', vegano: '🌿 Vegano', no_vegano: '🥪 No Vegano', bebida: '☕ Bebidas', trago: '🍹 Tragos' };
              return (
                <div key={cat}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>{catLabel[cat]}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {items.map(item => (
                      <div key={item.id} className="glass-card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap' }}>
                        {item.imageUrl && (
                          <div style={{ width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                            <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: '120px' }}>
                          <div style={{ fontWeight: 600 }}>{item.name}</div>
                          {item.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.description}</div>}
                        </div>
                        {item.price > 0 && <div style={{ color: 'var(--neon-cyan)', fontWeight: 600, whiteSpace: 'nowrap' }}>${item.price}</div>}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => { setMenuEditId(item.id); setMenuForm({ category: item.category, name: item.name, description: item.description, price: String(item.price), imageUrl: item.imageUrl, order: item.order }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
            <h3 className="text-cyan" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Configuración</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Actualizá la contraseña de acceso y gestioná opciones avanzadas del sistema.</p>

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

            {/* ── Zona Peligrosa ── */}
            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,16,122,0.2)' }}>
              <h4 style={{ color: 'var(--neon-pink)', marginBottom: '0.5rem' }}>⚠️ Zona Peligrosa</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                Esto borra <strong>todos</strong> los eventos, registros de participantes y matches. No se puede deshacer.
              </p>

              <div style={{ background: 'rgba(255,16,122,0.04)', border: '1px solid rgba(255,16,122,0.25)', padding: '1rem', borderRadius: '10px' }}>
                <label className="input-label" style={{ color: 'var(--neon-pink)' }}>Escribí <code style={{ background: 'rgba(0,0,0,0.4)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>BORRAR TODO</code> para habilitar</label>
                <input
                  type="text"
                  className="input-field"
                  value={wipeConfirmText}
                  onChange={(e) => setWipeConfirmText(e.target.value)}
                  placeholder="BORRAR TODO"
                  style={{ marginBottom: '0.75rem' }}
                />

                <label className="input-label" style={{ color: 'var(--neon-pink)' }}>Reingresá la contraseña de admin</label>
                <input
                  type="password"
                  className="input-field"
                  value={wipePasswordInput}
                  onChange={(e) => setWipePasswordInput(e.target.value)}
                  placeholder="Contraseña actual"
                  style={{ marginBottom: '1rem' }}
                />

                <button
                  onClick={handleWipeDatabase}
                  disabled={wipeLoading || wipeConfirmText !== 'BORRAR TODO' || !wipePasswordInput}
                  style={{
                    width: '100%',
                    background: wipeConfirmText === 'BORRAR TODO' && wipePasswordInput
                      ? 'linear-gradient(135deg, var(--neon-pink), #c0392b)'
                      : 'rgba(255,255,255,0.05)',
                    color: wipeConfirmText === 'BORRAR TODO' && wipePasswordInput ? 'white' : 'var(--text-muted)',
                    border: '1px solid rgba(255,16,122,0.4)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    cursor: wipeLoading || wipeConfirmText !== 'BORRAR TODO' || !wipePasswordInput ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                  }}
                >
                  {wipeLoading ? 'Borrando...' : '🗑️ Limpiar Base de Datos'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── HISTORIAL: Sub-tab Toggle ─── */}
        {(activeTab === 'participants' || activeTab === 'historico') && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', padding: '0.3rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', maxWidth: 'fit-content' }}>
            <button
              onClick={() => { setHistorialSubtab('eventos'); setActiveTab('historico'); }}
              style={{
                padding: '0.5rem 1.1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                background: activeTab === 'historico' ? 'rgba(0,255,255,0.12)' : 'transparent',
                color: activeTab === 'historico' ? 'var(--neon-cyan)' : 'var(--text-muted)',
                boxShadow: activeTab === 'historico' ? '0 0 10px rgba(0,255,255,0.15)' : 'none',
              }}
            >
              📅 Por Evento
            </button>
            <button
              onClick={() => { setHistorialSubtab('participantes'); setActiveTab('participants'); loadParticipants(); }}
              style={{
                padding: '0.5rem 1.1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                background: activeTab === 'participants' ? 'rgba(255,16,122,0.12)' : 'transparent',
                color: activeTab === 'participants' ? 'var(--neon-pink)' : 'var(--text-muted)',
                boxShadow: activeTab === 'participants' ? '0 0 10px rgba(255,16,122,0.15)' : 'none',
              }}
            >
              👥 Por Participante
            </button>
          </div>
        )}

        {/* ─── TAB: PARTICIPANTES ─── */}
        {activeTab === 'participants' && (() => {
          // Agrupar por teléfono (si tiene), luego instagram, luego nombre
          const groups: Record<string, ParticipantGroup> = {};
          for (const reg of allRegistrations) {
            const key = reg.phone
              ? `phone_${reg.phone}`
              : reg.instagram?.toLowerCase()
              ? `ig_${reg.instagram.toLowerCase()}`
              : `name_${reg.firstName}_${reg.lastName}`.toLowerCase();
            if (!groups[key]) {
              groups[key] = { key, instagram: reg.instagram || null, firstName: reg.firstName, lastName: reg.lastName, phone: reg.phone || null, registrations: [] };
            } else {
              // Actualizar instagram si el grupo no lo tenía
              if (!groups[key].instagram && reg.instagram) groups[key].instagram = reg.instagram;
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
                  onClick={() => setScanOpen(o => !o)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: 'rgba(255,16,122,0.12)', border: '1px solid rgba(255,16,122,0.4)',
                    color: 'var(--neon-pink)', padding: '0.4rem 1rem', borderRadius: '8px',
                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
                    boxShadow: '0 0 10px rgba(255,16,122,0.15)', transition: 'all 0.2s',
                  }}
                >
                  📷 Escanear Cuaderno
                </button>
                <button
                  onClick={loadParticipants}
                  disabled={participantsLoading}
                  style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-muted)', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {participantsLoading ? '⏳ Cargando...' : '🔄 Actualizar'}
                </button>
              </div>

              {/* ── Scanner de cuaderno ── */}
              {scanOpen && (
                <div className="glass-card" style={{ border: '1px solid rgba(255,16,122,0.25)', marginBottom: '2rem' }}>
                  <h4 className="text-pink" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>📷 Importar desde foto del cuaderno</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    Sacá una foto del cuaderno de Mariana y la IA va a extraer automáticamente los participantes y los grupos a los que pertenecen.
                  </p>

                  {/* Upload area */}
                  {!scanResult && (
                    <div
                      onClick={() => scanInputRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleScanImage(f); }}
                      style={{
                        border: '2px dashed rgba(255,16,122,0.3)', borderRadius: '12px',
                        padding: '2.5rem', textAlign: 'center', cursor: 'pointer',
                        transition: 'all 0.2s', background: 'rgba(255,16,122,0.04)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,16,122,0.6)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,16,122,0.3)')}
                    >
                      {scanLoading ? (
                        <div>
                          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔍</div>
                          <p style={{ color: 'var(--neon-pink)', fontWeight: 700 }}>Analizando imagen con IA...</p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Esto puede tardar unos segundos</p>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📸</div>
                          <p style={{ color: 'white', fontWeight: 600, marginBottom: '0.4rem' }}>Subí o arrastrá la foto del cuaderno</p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>JPG, PNG, WEBP — la IA extrae todo automáticamente</p>
                        </div>
                      )}
                      <input
                        ref={scanInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleScanImage(f); }}
                      />
                    </div>
                  )}

                  {/* Preview de resultados */}
                  {scanResult && !scanLoading && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                        <span style={{ color: '#39ff14', fontWeight: 700 }}>
                          ✓ Detectados {scanResult.participantes.length} participante{scanResult.participantes.length !== 1 ? 's' : ''} en {scanResult.eventosDetectados.length} grupo{scanResult.eventosDetectados.length !== 1 ? 's' : ''}
                        </span>
                        <button
                          onClick={() => { setScanResult(null); }}
                          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', padding: '0.3rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          ↩ Nueva foto
                        </button>
                      </div>

                      {/* Participantes detectados — tabla desktop / cards mobile */}
                      {/* Desktop */}
                      <div className="reg-table-desktop" style={{ overflowX: 'auto', marginBottom: '1.25rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '480px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                              {['Nombre', 'Género', 'Teléfono', 'Bebida', 'Grupos'].map(h => (
                                <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {scanResult.participantes.map((p, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '0.6rem 0.75rem', color: 'white', whiteSpace: 'nowrap' }}>{p.firstName} {p.lastName}</td>
                                <td style={{ padding: '0.6rem 0.75rem', color: p.gender === 'Mujer' ? 'var(--neon-pink)' : 'var(--neon-cyan)', whiteSpace: 'nowrap' }}>{p.gender}</td>
                                <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.phone || '—'}</td>
                                <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.selectedDrink || '—'}</td>
                                <td style={{ padding: '0.6rem 0.75rem' }}>
                                  {p.grupos.map(g => (
                                    <span key={g} style={{ background: 'rgba(0,255,255,0.1)', color: 'var(--neon-cyan)', border: '1px solid rgba(0,255,255,0.2)', borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.75rem', marginRight: '0.3rem' }}>G{g}</span>
                                  ))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Mobile cards */}
                      <div className="reg-cards-mobile" style={{ flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        {scanResult.participantes.map((p, i) => (
                          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 600, color: p.gender === 'Mujer' ? 'var(--neon-pink)' : 'var(--neon-cyan)', marginBottom: '0.35rem' }}>
                              {p.firstName} {p.lastName}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.8rem', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{p.gender === 'Mujer' ? '👩' : '👨'} {p.gender}</span>
                              {p.phone && <span style={{ color: 'var(--text-muted)' }}>📱 {p.phone}</span>}
                              {p.selectedDrink && <span style={{ color: 'var(--text-muted)' }}>🍹 {p.selectedDrink}</span>}
                              <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>
                                {p.grupos.map(g => (
                                  <span key={g} style={{ background: 'rgba(0,255,255,0.1)', color: 'var(--neon-cyan)', border: '1px solid rgba(0,255,255,0.2)', borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}>G{g}</span>
                                ))}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={handleImport}
                          disabled={importLoading}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            background: 'rgba(57,255,20,0.12)', border: '1px solid rgba(57,255,20,0.4)',
                            color: '#39ff14', padding: '0.7rem 1.5rem', borderRadius: '10px',
                            cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
                            boxShadow: '0 0 12px rgba(57,255,20,0.2)', transition: 'all 0.2s',
                            opacity: importLoading ? 0.6 : 1,
                          }}
                        >
                          {importLoading ? '⏳ Importando...' : '✓ Confirmar e importar'}
                        </button>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          Se van a crear {scanResult.eventosDetectados.length} grupo{scanResult.eventosDetectados.length !== 1 ? 's' : ''} y {scanResult.participantes.reduce((a, p) => a + p.grupos.length, 0)} registros
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                                          {reg.event
                                            ? (reg.event.groupNumber != null ? `Grupo ${reg.event.groupNumber}` : reg.event.type)
                                            : reg.eventType ?? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Evento eliminado</span>}
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

        {/* ─── TAB: HISTÓRICO ─── */}
        {activeTab === 'historico' && (() => {
          const eventsSorted = [...eventList].sort(
            (a, b) => (b.groupNumber ?? 0) - (a.groupNumber ?? 0)
          );

          const q = historicoSearch.trim().toLowerCase();
          const eventsFiltered = !q ? eventsSorted : eventsSorted.filter(ev => {
            if (ev.groupNumber != null && (`g${ev.groupNumber}` === q || String(ev.groupNumber) === q || String(ev.groupNumber).includes(q))) return true;
            if (ev.type.toLowerCase().includes(q)) return true;
            if ((ev.ageRange || '').toLowerCase().includes(q)) return true;
            const dateStr = format(new Date(ev.date), "dd/MM/yyyy", { locale: es });
            const dateLong = format(new Date(ev.date), "d 'de' MMMM yyyy", { locale: es }).toLowerCase();
            if (dateStr.includes(q) || dateLong.includes(q)) return true;
            return false;
          });

          const computeMatchesInEvent = (regs: RegistrationWithEvent[], eventId: string) => {
            const md = matchDataByEvent[eventId];
            const sel = md?.selections || {};
            const matchesByReg: Record<string, RegistrationWithEvent[]> = {};
            for (const r of regs) {
              const mySel = sel[r.id] || [];
              matchesByReg[r.id] = regs.filter(o =>
                o.id !== r.id && mySel.includes(o.id) && (sel[o.id] || []).includes(r.id)
              );
            }
            const seen = new Set<string>();
            let pairCount = 0;
            for (const r of regs) {
              for (const m of matchesByReg[r.id] || []) {
                const key = [r.id, m.id].sort().join('|');
                if (!seen.has(key)) { seen.add(key); pairCount++; }
              }
            }
            return { matchesByReg, pairCount };
          };

          const formatPartner = (m?: RegistrationWithEvent) =>
            m ? `${m.firstName} ${m.lastName}`.trim() : null;

          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.5rem', margin: 0 }}>📚 Histórico de Eventos</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
                    Resumen rápido: participantes y matches de cada evento. {eventsFiltered.length}{q ? ` de ${eventsSorted.length}` : ''} eventos.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!window.confirm('¿Cargar los 40 grupos históricos en la base de datos? Los que ya existen se saltean.')) return;
                    try {
                      const res = await fetch('/api/seed-events', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password: currentAdminPassword }),
                      });
                      const data = await res.json();
                      if (data.ok) {
                        showSuccess(`✅ ${data.created} grupos cargados, ${data.skipped} ya existían.`);
                        await reloadEvents();
                      } else { setError(data.error); }
                    } catch { setError('Error cargando grupos'); }
                  }}
                  style={{ background: 'rgba(0,255,255,0.1)', border: '1px solid rgba(0,255,255,0.3)', color: 'var(--neon-cyan)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                >
                  🗂️ Cargar Grupos Históricos
                </button>
              </div>

              <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  className="input-field"
                  value={historicoSearch}
                  onChange={(e) => setHistoricoSearch(e.target.value)}
                  placeholder="🔍 Buscar por grupo (G40, 40), fecha (07/05/2026) o tipo de evento…"
                  style={{ paddingRight: q ? '2.5rem' : undefined }}
                />
                {q && (
                  <button
                    onClick={() => setHistoricoSearch('')}
                    style={{
                      position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--text-muted)',
                      cursor: 'pointer', fontSize: '1.1rem', padding: '0.2rem 0.4rem',
                    }}
                    aria-label="Limpiar búsqueda"
                  >
                    ✕
                  </button>
                )}
              </div>

              {participantsLoading && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando…</div>
              )}

              {!participantsLoading && eventsSorted.length === 0 && (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
                  <p>Todavía no hay eventos cargados.</p>
                </div>
              )}

              {!participantsLoading && eventsSorted.length > 0 && eventsFiltered.length === 0 && (
                <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                  <p>Ningún evento coincide con &quot;{historicoSearch}&quot;.</p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {eventsFiltered.map(ev => {
                  const regs = allRegistrations.filter(r => (r.eventId ?? r.archivedEventId) === ev.id);
                  const men = regs.filter(r => r.gender === 'Hombre').sort((a, b) => a.firstName.localeCompare(b.firstName));
                  const women = regs.filter(r => r.gender === 'Mujer').sort((a, b) => a.firstName.localeCompare(b.firstName));
                  const { matchesByReg, pairCount } = computeMatchesInEvent(regs, ev.id);

                  const renderRow = (r: RegistrationWithEvent, color: string) => {
                    const partners = matchesByReg[r.id] || [];
                    return (
                      <div key={r.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        gap: '0.75rem', padding: '0.5rem 0.75rem',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        fontSize: '0.85rem',
                      }}>
                        <span style={{ color: 'white', fontWeight: 500 }}>{r.firstName} {r.lastName}</span>
                        {partners.length > 0 ? (
                          <span style={{ color, fontSize: '0.78rem', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            💘 {partners.map(formatPartner).join(', ')}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', opacity: 0.5 }}>—</span>
                        )}
                      </div>
                    );
                  };

                  return (
                    <div key={ev.id} className="glass-card" style={{ padding: '1.25rem' }}>
                      {/* Header */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>
                          {ev.groupNumber != null ? `Grupo ${ev.groupNumber}` : ev.type}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>·</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {format(new Date(ev.date), "dd/MM/yyyy", { locale: es })}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>·</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{ev.ageRange}</span>
                        <span style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                            👥 {regs.length}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--neon-pink)', background: 'rgba(255,16,122,0.08)', border: '1px solid rgba(255,16,122,0.25)', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                            💘 {pairCount}
                          </span>
                        </span>
                      </div>

                      {regs.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0', opacity: 0.7 }}>Sin participantes registrados.</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                          {/* Hombres */}
                          {men.length > 0 && (
                            <div>
                              <div style={{ color: 'var(--neon-cyan)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, marginBottom: '0.4rem', paddingBottom: '0.3rem', borderBottom: '1px solid rgba(0,255,255,0.15)' }}>
                                🙋‍♂️ Hombres ({men.length})
                              </div>
                              {men.map(r => renderRow(r, 'var(--neon-cyan)'))}
                            </div>
                          )}
                          {/* Mujeres */}
                          {women.length > 0 && (
                            <div>
                              <div style={{ color: 'var(--neon-pink)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, marginBottom: '0.4rem', paddingBottom: '0.3rem', borderBottom: '1px solid rgba(255,16,122,0.15)' }}>
                                🙋‍♀️ Mujeres ({women.length})
                              </div>
                              {women.map(r => renderRow(r, 'var(--neon-pink)'))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
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

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
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

      {/* Modal instrucciones instalar PWA */}
      {showInstallTip && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowInstallTip(false)}>
          <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,16,122,0.3)', borderRadius: '16px', padding: '2rem', maxWidth: '340px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>📲 Instalar app</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '1rem' }}>
              <strong style={{ color: 'white' }}>En Chrome (Android):</strong><br />
              Tocá los 3 puntos ⋮ arriba a la derecha → <em>"Agregar a pantalla de inicio"</em>
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              <strong style={{ color: 'white' }}>En Safari (iPhone):</strong><br />
              Tocá el ícono compartir <em>⬆</em> → <em>"Agregar a pantalla de inicio"</em>
            </p>
            <button onClick={() => setShowInstallTip(false)} style={{ width: '100%', padding: '0.75rem', background: 'var(--neon-pink)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
