import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminPassword } from "@/lib/auth";
import { isReservationActive } from "@/lib/reservations";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope"); // "admin" => devolver todas

    const events = await prisma.event.findMany({
      orderBy: { date: "desc" },
      include: {
        registrations: { orderBy: { createdAt: "desc" } },
      },
    });

    if (scope === "admin") {
      // Admin recibe todos (incluye archivados para el historial)
      return NextResponse.json(events);
    }

    // Público: excluir archivados y cerrados, filtrar reservas expiradas
    const filtered = events
      .filter((ev) => !ev.archived && !ev.closed)
      .map((ev) => ({
        ...ev,
        registrations: ev.registrations.filter((r) => isReservationActive(r)),
      }));

    return NextResponse.json(filtered);
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching events" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type,
      date,
      time,
      ageRange,
      drinksAvailable,
      spotsPerGender,
      password,
      mpEnabled,
      price,
      groupNumber,
    } = body;

    // Simple Admin Auth
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Combine date and time. Forzamos offset Uruguay (-03:00) para evitar
    // que el servidor (en UTC) interprete 21:00 como 21:00 UTC y termine mostrando 18:00 local.
    const eventDate = new Date(`${date}T${time}:00-03:00`);

    let gn: number;
    if (groupNumber !== undefined && groupNumber !== null && groupNumber !== '') {
      gn = parseInt(String(groupNumber), 10);
      const dup = await prisma.event.findUnique({ where: { groupNumber: gn } });
      if (dup) {
        return NextResponse.json(
          { error: `Ya existe un evento con número de grupo ${gn}` },
          { status: 400 },
        );
      }
    } else {
      const last = await prisma.event.findFirst({
        where: { groupNumber: { not: null } },
        orderBy: { groupNumber: 'desc' },
      });
      gn = (last?.groupNumber ?? 0) + 1;
    }

    const event = await prisma.event.create({
      data: {
        type,
        date: eventDate,
        ageRange,
        drinksAvailable,
        spotsPerGender: parseInt(spotsPerGender || "8", 10),
        mpEnabled: mpEnabled !== false, // Defaults to true
        price: parseInt(price, 10) || 850,
        groupNumber: gn,
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error creating event" },
      { status: 500 },
    );
  }
}
