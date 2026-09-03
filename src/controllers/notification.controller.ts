import type { Response } from 'express';
import { prisma } from '../lib/prisma';
import type { AuthRequest } from '../types/auth';

async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.contributor) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { unreadOnly } = req.query as { unreadOnly?: string };

    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: req.contributor.id,
        ...(unreadOnly === 'true' ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { recipientId: req.contributor.id, read: false },
    });

    res.status(200).json({ data: notifications, unreadCount });
  } catch (error) {
    console.error('getNotifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

async function markAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.contributor) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    if (notification.recipientId !== req.contributor.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.status(200).json({ data: updated });
  } catch (error) {
    console.error('markAsRead error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}

async function markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.contributor) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    await prisma.notification.updateMany({
      where: { recipientId: req.contributor.id, read: false },
      data: { read: true },
    });

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('markAllAsRead error:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
}

export const notificationController = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
