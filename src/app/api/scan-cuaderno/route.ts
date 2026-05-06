import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyAdminPassword } from '@/lib/auth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const PROMPT = `Sos un asistente que extrae datos de fotos de cuadernos de registro de eventos de speed dating.
El cuaderno tiene este formato por participante:
- Nombre y apellido
- Edad (años)
- Género (sección "Hombres" o "Mujeres")
- Celular
- Bebida
- Grupo (número/s de evento/s en los que participó, pueden ser varios separados por coma)
- A veces hay un número de grupo en la parte superior (ej: "Grupo 40")
- El rango de edad del evento puede aparecer (ej: "Mujeres: 25 a 45 años")

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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
      PROMPT,
      { inlineData: { data: base64, mimeType } },
    ]);

    const raw = result.response.text().trim();
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const data = JSON.parse(jsonStr);

    return NextResponse.json(data);
  } catch (e) {
    console.error('scan-cuaderno error:', e);
    return NextResponse.json({ error: 'Error procesando imagen' }, { status: 500 });
  }
}
