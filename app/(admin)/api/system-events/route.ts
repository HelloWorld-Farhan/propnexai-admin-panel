import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const date = searchParams.get("date") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 15;

    let where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
        { company: { name: { contains: search, mode: "insensitive" } } }
      ];
    }

    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        const startOfDay = new Date(parsedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(parsedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        where.createdAt = {
          gte: startOfDay,
          lte: endOfDay
        };
      }
    }

    const [events, total] = await Promise.all([
      prisma.systemEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          company: { select: { name: true, parentCompany: { select: { name: true } } } }
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.systemEvent.count({ where })
    ]);

    const formattedEvents = events.map(e => ({
      id: e.id,
      company: { name: e.company?.parentCompany?.name || e.company?.name || "System" },
      type: e.type,
      title: e.title,
      message: e.message,
      createdAt: e.createdAt.toISOString()
    }));

    return NextResponse.json({
      events: formattedEvents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("[SYSTEM_EVENTS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch system events" }, { status: 500 });
  }
}
