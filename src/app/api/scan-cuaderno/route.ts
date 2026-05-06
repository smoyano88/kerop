import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyAdminPassword } from '@/lib/auth';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Eres un asistente que extrae datos de fotos de cuadernos de registro de eventos de speed dating.
El cuaderno de Mariana tiene este formato por participante:
- Nombre y apellido
- Edad (años)
- Género (Hombres / Mujeres)
- Celular
- Bebida
- Grupo (número/s de evento/s en los que participó, pueden ser varios separados por coma)
- A veces hay un número de evento/grupo en la parte superior de la página (ej: "Grupo 40", "NO: 13/05")
- El rango de edad del evento puede aparecer (ej: "Mujeres: 25 a 45 años")
- El tipo de evento puede inferirse del género de los participantes listados

Devolvé ÚNICAMENTE un JSON válido con esta estructura, sin texto adicional:
{
  "participantes": [
    {
      "firstName": "string",
      "lastName": "string",
      "gender": "Hombre" | "Mujer",
      "phone": "string o null",
      "selectedDrink": "string",
      "age": number | null,
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
    const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: 'Extraé todos los datos de participantes y eventos que veas en esta foto del cuaderno.',
            },
          ],
        },
      ],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '';
    // Strip markdown code blocks if present
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const data = JSON.parse(jsonStr);

    return NextResponse.json(data);
  } catch (e) {
    console.error('scan-cuaderno error:', e);
    return NextResponse.json({ error: 'Error procesando imagen' }, { status: 500 });
  }
}
