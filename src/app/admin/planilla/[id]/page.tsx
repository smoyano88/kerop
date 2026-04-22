import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PrintActions from './PrintActions';

export default async function PlanillaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) return notFound();

  // Generamos siempre 15 filas vacías para que el participante anote
  const emptyRows = Array.from({ length: 15 });

  return (
    <div className="planilla-root">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Permanent+Marker&family=Shadows+Into+Light&display=swap');
        
        /* Enviar margen 0 al navegador para ocultar su header y footer por defecto */
        @page {
          size: auto;
          margin: 0mm; 
        }

        .planilla-root {
          background-color: white;
          color: #111;
          font-family: 'Shadows Into Light', cursive, sans-serif;
          padding: 30px;
        }
        
        .no-print {
          text-align: center;
          margin-bottom: 20px;
          padding-top: 20px;
        }

        .print-container {
          max-width: 750px;
          margin: 1cm auto;
          border: 4px solid #111;
          /* Secret hand-drawn border CSS trick */
          border-radius: 255px 15px 225px 15px/15px 225px 15px 255px;
          padding: 40px;
          background: white;
          position: relative;
        }

        /* Fibron clip top */
        .print-container::before {
          content: '';
          position: absolute;
          top: -25px;
          left: 50%;
          transform: translateX(-50%) rotate(-2deg);
          width: 140px;
          height: 40px;
          background: #e5e5e5;
          border: 4px solid #111;
          border-radius: 10px;
          box-shadow: inset 0 -6px 0 rgba(0,0,0,0.15);
          z-index: 10;
        }

        .header-box {
          text-align: center;
          margin-bottom: 40px;
          position: relative;
          margin-top: 15px;
        }

        .highlight-title {
          display: inline-block;
          font-family: 'Permanent Marker', cursive, sans-serif;
          font-size: 52px;
          color: #111;
          position: relative;
          z-index: 1;
          transform: rotate(-3deg);
          margin: 0;
        }
        
        /* Grueso fibron rosa flúo */
        .highlight-title::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: -20px;
          right: -30px;
          height: 35px;
          background-color: rgba(255, 16, 122, 0.5);
          z-index: -1;
          transform: rotate(2deg);
          border-radius: 2px 25px 3px 20px;
        }

        .subtitle-row {
          display: flex;
          align-items: flex-end;
          margin-bottom: 30px;
          font-size: 30px;
          font-weight: bold;
          font-family: 'Caveat', cursive, sans-serif;
          transform: rotate(-1deg);
        }

        .line-blank {
          flex: 1;
          border-bottom: 4px dashed #111;
          margin-left: 15px;
          height: 30px;
        }

        .planilla-table {
          width: 100%;
          border-collapse: collapse;
          border: 4px solid #111;
        }

        .planilla-table th {
          font-family: 'Permanent Marker', cursive, sans-serif;
          font-size: 26px;
          color: #111;
          padding: 12px 5px;
          border-bottom: 5px solid #111;
          border-right: 4px solid #111;
        }
        .planilla-table th:last-child {
          border-right: none;
        }
        
        .planilla-table td {
          padding: 15px 5px;
          font-size: 26px;
          border-bottom: 3px dashed #555;
          height: 85px;
          font-family: 'Caveat', cursive, sans-serif;
        }

        .col-num { width: 8%; text-align: center; font-family: 'Permanent Marker', cursive, sans-serif; border-right: 4px solid #111; }
        .col-name { width: 35%; padding-left: 15px !important; border-right: 4px solid #111; }
        .col-comments { width: 45%; padding-left: 15px !important; border-right: 4px solid #111; }
        .col-match { width: 12%; text-align: center; }

        @media print {
          html, body {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          .planilla-root { padding: 0 !important; overflow: hidden; }
          .no-print { display: none !important; }
          .print-container { 
             margin: 1cm auto; 
             border: none; 
             padding: 0 20px; 
             max-width: 100%; 
             box-shadow: none; 
             border-radius: 0; 
          }
          .print-container::before { display: none; }
          .highlight-title::after {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />

      <div className="no-print">
        <PrintActions />
      </div>

      <div className="print-container">
        <div className="header-box">
          <h1 className="highlight-title">SPEED DATING Kerop. ♡</h1>
        </div>
        
        <div className="subtitle-row">
          <span>TARJETA DE:</span>
          <div className="line-blank"></div>
        </div>

        <table className="planilla-table">
          <thead>
            <tr>
              <th className="col-num">N°</th>
              <th className="col-name" style={{textAlign: 'left'}}>NOMBRE</th>
              <th className="col-comments" style={{textAlign: 'left'}}>COMENTARIOS</th>
              <th className="col-match">SI / NO</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>
                <td className="col-num">{i + 1}</td>
                <td className="col-name"></td>
                <td className="col-comments"></td>
                <td className="col-match"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
