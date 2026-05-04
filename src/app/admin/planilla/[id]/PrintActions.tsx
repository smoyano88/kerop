'use client';
import { useEffect } from 'react';

export default function PrintActions() {
  useEffect(() => {
    // Esperar fuentes + dos frames de paint antes de abrir el diálogo.
    // document.fonts.ready garantiza las fuentes; el doble rAF garantiza que
    // el browser ya pintó el contenido en pantalla (evita página en blanco).
    document.fonts.ready.then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.print();
        });
      });
    });
  }, []);

  return (
    <div className="no-print" style={{ textAlign: 'center', marginBottom: '20px' }}>
      <button 
        onClick={() => window.print()} 
        style={{ padding: '10px 20px', background: '#eab308', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        Imprimir Planilla
      </button>
    </div>
  );
}
