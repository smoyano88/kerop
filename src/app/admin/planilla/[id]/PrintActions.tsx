'use client';
import { useEffect } from 'react';

export default function PrintActions() {
  useEffect(() => {
    // Auto-imprimir al cargar
    const timeout = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(timeout);
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
