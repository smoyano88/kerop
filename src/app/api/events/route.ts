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
      return NextResponse.json(events);
    }

    // Para uso público: filtrar registraciones expiradas para que no bloqueen cupos
    const filtered = events.map((ev) => ({
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
    } = body;

    // Simple Admin Auth
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Combine date and time
    const eventDate = new Date(`${date}T${time}`);

    const event = await prisma.event.create({
      data: {
        type,
        date: eventDate,
        ageRange,
        drinksAvailable,
        spotsPerGender: parseInt(spotsPerGender || "8", 10),
        mpEnabled: mpEnabled !== false, // Defaults to true
        price: parseInt(price, 10) || 850,
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
