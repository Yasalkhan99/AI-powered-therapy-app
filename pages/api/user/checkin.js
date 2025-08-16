import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import prisma from "../../../lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { mood, energy } = req.body;
  if (typeof mood !== "number" || !["Low", "Medium", "High"].includes(energy)) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    // Check if user has already submitted a check-in within the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const existingCheckin = await prisma.checkin.findFirst({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: twentyFourHoursAgo
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (existingCheckin) {
      // Calculate time until next check-in is allowed
      const nextCheckinTime = new Date(existingCheckin.createdAt.getTime() + 24 * 60 * 60 * 1000);
      const timeUntilNext = nextCheckinTime - new Date();
      const hoursRemaining = Math.ceil(timeUntilNext / (1000 * 60 * 60));
      
      return res.status(429).json({ 
        error: "You have already submitted a check-in today. You can submit again after 24 hours.",
        nextCheckinTime: nextCheckinTime.toISOString(),
        hoursRemaining: hoursRemaining
      });
    }

    const checkin = await prisma.checkin.create({
      data: {
        userId: session.user.id,
        mood,
        energy,
      },
    });
    res.status(201).json({ checkin });
  } catch (error) {
    console.error("Failed to save check-in:", error);
    res.status(500).json({ error: "Failed to save check-in" });
  }
} 