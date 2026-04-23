import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: { date: "desc" },
      include: {
        registrations: { orderBy: { createdAt: "desc" } },
      },
    });

    return NextResponse.json(events);
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
    } = body;

    // Simple Admin Auth
    if (password !== "Kerop2024") {
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
