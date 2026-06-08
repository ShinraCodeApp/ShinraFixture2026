import { prisma } from '../config/database';

const USER_PUBLIC_FIELDS = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  level: true,
  predictionPoints: true,
  country: true,
};

export class FriendsService {
  static async sendRequest(fromUserId: string, toUserId: string) {
    if (fromUserId === toUserId) throw new Error('No puedes agregarte a ti mismo');

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') throw new Error('Ya son amigos');
      if (existing.status === 'PENDING') throw new Error('Solicitud ya enviada');
      throw new Error('No se puede enviar solicitud');
    }

    return prisma.friendship.create({
      data: { fromUserId, toUserId, status: 'PENDING' },
      include: { toUser: { select: USER_PUBLIC_FIELDS } },
    });
  }

  static async acceptRequest(userId: string, friendshipId: string) {
    const f = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!f || f.toUserId !== userId) throw new Error('Solicitud no encontrada');
    if (f.status !== 'PENDING') throw new Error('La solicitud ya fue procesada');

    return prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED' },
      include: { fromUser: { select: USER_PUBLIC_FIELDS } },
    });
  }

  static async rejectOrRemove(userId: string, friendshipId: string) {
    const f = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!f) throw new Error('No encontrado');
    if (f.fromUserId !== userId && f.toUserId !== userId) throw new Error('Sin permiso');

    await prisma.friendship.delete({ where: { id: friendshipId } });
  }

  static async listFriends(userId: string) {
    const rows = await prisma.friendship.findMany({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }], status: 'ACCEPTED' },
      include: {
        fromUser: { select: USER_PUBLIC_FIELDS },
        toUser:   { select: USER_PUBLIC_FIELDS },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((r) => ({
      friendshipId: r.id,
      since: r.updatedAt,
      user: r.fromUserId === userId ? r.toUser : r.fromUser,
    }));
  }

  static async listRequests(userId: string) {
    return prisma.friendship.findMany({
      where: { toUserId: userId, status: 'PENDING' },
      include: { fromUser: { select: USER_PUBLIC_FIELDS } },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async searchUsers(currentUserId: string, q: string) {
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          { isBanned: false },
          {
            OR: [
              { username:    { contains: q, mode: 'insensitive' } },
              { displayName: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: USER_PUBLIC_FIELDS,
      take: 20,
    });

    // Attach friendship status for each result
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { fromUserId: currentUserId, toUserId: { in: users.map((u) => u.id) } },
          { toUserId: currentUserId, fromUserId: { in: users.map((u) => u.id) } },
        ],
      },
    });

    return users.map((u) => {
      const f = friendships.find(
        (fr) => (fr.fromUserId === currentUserId && fr.toUserId === u.id)
               || (fr.toUserId === currentUserId && fr.fromUserId === u.id),
      );
      return { ...u, friendshipId: f?.id ?? null, friendshipStatus: f?.status ?? null };
    });
  }
}
