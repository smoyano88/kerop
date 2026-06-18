import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyAdminPassword } from '@/lib/auth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const PROMPT = `Sos un asistente que extrae datos de fotos de cuadernos de registro de eventos de speed dating.

IMPORTANTE: La foto puede mostrar UNA o VARIAS páginas del cuaderno con MÚLTIPLES participantes. Extraé TODOS los participantes que aparezcan en la imagen, sin omitir ninguno.

El cuaderno tiene este formato por participante:
- Nombre y apellido
- Edad (años)
- Género: los participantes están agrupados bajo encabezados "Hombres" o "Mujeres" — usá eso para asignar el género de cada uno
- Celular
- Bebida (lo que pidieron para tomar)
- Grupo (número/s de evento/s en los que participó, pueden ser varios separados por coma)
- A veces hay un número de grupo en la parte superior de la página (ej: "Grupo 40") — ese es el groupNumber del evento de esa hoja
- El rango de edad del evento puede aparecer (ej: "Mujeres: 25 a 45 años", "Hombres: 28 a 48 años")

Reglas:
- Si un participante tiene múltiples números de grupo en su fila, incluí todos en el array "grupos"
- Si el número de grupo de la página es el único indicador, asignalo a todos los participantes de esa página
- Si hay información de fecha (ej: "18/10/2024"), incluila en eventosDetectados
- Si no aparece celular, usá null
- Si no aparece bebida, usá "Sin especificar"
- Si no aparece edad, usá null

Devolvé ÚNICAMENTE un JSON válido con esta estructura, sin texto adicional ni markdown:
{
  "participantes": [
    {
      "firstName": "string",
      "lastName": "string",
      "gender": "Hombre o Mujer",
      "phone": "string o null",
      "selectedDrink": "string",
      "age": number o null,
      "grupos": [number, ...]
    }
  ],
  "eventosDetectados": [
    {
      "groupNumber": number,
      "ageRange": "string o vacío",
      "date": "string con fecha si aparece o vacío",
      "type": "string si se puede inferir o vacío"
    }
  ]
}`;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const password = formData.get('password') as string;
    const file = formData.get('image') as File;

    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (!file) {
      return NextResponse.json({ error: 'No se envió imagen' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = (file.type || 'image/jpeg') as string;

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const result = await model.generateContent([
      PROMPT,
      { inlineData: { data: base64, mimeType } },
    ]);

    const raw = result.response.text().trim();
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const data = JSON.parse(jsonStr);

    return NextResponse.json(data);
  } catch (e: any) {
    console.error('scan-cuaderno error:', e);
    if (e?.status === 503) {
      return NextResponse.json({ error: 'Gemini está con alta demanda ahora. Esperá unos segundos y volvé a intentar.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Error procesando imagen' }, { status: 500 });
  }
}
