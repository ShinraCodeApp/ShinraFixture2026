import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';

interface CreateDto {
  name: string;
  description?: string;
  maxMembers?: number;
  prizeDescription?: string;
  matchPrizeEnabled?: boolean;
  matchPrizeDefault?: string;
  matchPrizeCustom?: Record<string, string>;
  isPrivate?: boolean;
  tournamentId?: string;
}

const groupInclude = {
  members: {
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatar: true, level: true },
      },
    },
    orderBy: { totalPoints: 'desc' as const },
  },
  _count: { select: { members: true } },
};

export class QuinielaService {
  static async myGroups(userId: string) {
    return prisma.quinielaGroup.findMany({
      where: { members: { some: { userId } }, isActive: true },
      include: {
        ...groupInclude,
        members: {
          where: { userId },
          select: { role: true, totalPoints: true, rank: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async create(userId: string, isPremium: boolean, dto: CreateDto) {
    const existingCount = await prisma.quinielaGroup.count({
      where: { ownerId: userId, isActive: true },
    });

    const maxGroups = isPremium ? 10 : 2;
    if (existingCount >= maxGroups) {
      const msg = isPremium
        ? `Máximo ${maxGroups} quinielas activas como creador`
        : 'Los usuarios gratuitos pueden crear hasta 2 quinielas. Activá Premium para crear más.';
      throw ApiError.badRequest(msg);
    }

    return prisma.quinielaGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        ownerId: userId,
        maxMembers: dto.maxMembers ?? 20,
        prizeDescription: dto.prizeDescription,
        matchPrizeEnabled: dto.matchPrizeEnabled ?? false,
        matchPrizeDefault: dto.matchPrizeDefault,
        matchPrizeCustom: dto.matchPrizeCustom ?? {},
        isPrivate: dto.isPrivate ?? true,
        tournamentId: dto.tournamentId,
        members: {
          create: {
            userId,
            role: 'OWNER',
            totalPoints: 0,
          },
        },
      },
      include: groupInclude,
    });
  }

  static async getPreviewByCode(inviteCode: string) {
    const group = await prisma.quinielaGroup.findUnique({
      where: { inviteCode },
      select: {
        id: true,
        name: true,
        prizeDescription: true,
        maxMembers: true,
        isActive: true,
        _count: { select: { members: true } },
      },
    });
    if (!group || !group.isActive) return null;
    return {
      id: group.id,
      name: group.name,
      prizeDescription: group.prizeDescription,
      maxMembers: group.maxMembers,
      memberCount: group._count.members,
      isFull: group._count.members >= group.maxMembers,
    };
  }

  static async join(userId: string, isPremium: boolean, inviteCode: string) {
    const group = await prisma.quinielaGroup.findUnique({
      where: { inviteCode },
      include: { _count: { select: { members: true } } },
    });

    if (!group) throw ApiError.notFound('Group with this invite code');
    if (!group.isActive) throw ApiError.badRequest('This group is no longer active');
    if (group._count.members >= group.maxMembers) {
      throw ApiError.badRequest('Group is full');
    }

    if (!isPremium) {
      const memberCount = await prisma.quinielaGroupMember.count({ where: { userId } });
      if (memberCount >= 5) {
        throw ApiError.badRequest('Los usuarios gratuitos pueden unirse a hasta 5 quinielas. Activá Premium para más.');
      }
    }

    const existing = await prisma.quinielaGroupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
    });
    if (existing) throw ApiError.conflict('Already a member of this group');

    await prisma.quinielaGroupMember.create({
      data: { groupId: group.id, userId, role: 'MEMBER' },
    });

    return this.getById(group.id, userId);
  }

  static async getById(groupId: string, userId: string) {
    const group = await prisma.quinielaGroup.findUnique({
      where: { id: groupId },
      include: groupInclude,
    });

    if (!group) return null;

    // Check membership for private groups
    if (group.isPrivate) {
      const isMember = group.members.some((m: any) => m.userId === userId);
      if (!isMember) throw ApiError.forbidden('This is a private group');
    }

    return group;
  }

  static async getStandings(groupId: string, requesterId: string) {
    const group = await prisma.quinielaGroup.findUnique({ where: { id: groupId } });
    if (!group) throw ApiError.notFound('Group');

    const members = await prisma.quinielaGroupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true, username: true, displayName: true, avatar: true,
            level: true, country: true,
          },
        },
      },
      orderBy: { totalPoints: 'desc' },
    });

    return members.map((m, i) => ({ ...m, rank: i + 1 }));
  }

  static async getPredictions(groupId: string, requesterId: string) {
    const isMember = await prisma.quinielaGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId: requesterId } },
    });
    if (!isMember) throw ApiError.forbidden('Not a member of this group');

    return prisma.prediction.findMany({
      where: { quinielaGroupId: groupId },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatar: true } },
        match: {
          select: {
            id: true, matchDate: true, status: true, stage: true, group: true,
            homeScore: true, awayScore: true,
            homeTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
            awayTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
          },
        },
      },
      orderBy: { match: { matchDate: 'asc' } },
    });
  }

  static async leave(groupId: string, userId: string): Promise<void> {
    const member = await prisma.quinielaGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw ApiError.notFound('Membership');
    if (member.role === 'OWNER') {
      throw ApiError.badRequest('Owner cannot leave. Transfer ownership or delete the group.');
    }
    await prisma.quinielaGroupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });
  }

  static async delete(groupId: string, userId: string): Promise<void> {
    const group = await prisma.quinielaGroup.findUnique({ where: { id: groupId } });
    if (!group) throw ApiError.notFound('Group');
    if (group.ownerId !== userId) throw ApiError.forbidden('Only the owner can delete this group');

    await prisma.quinielaGroup.update({ where: { id: groupId }, data: { isActive: false } });
  }

  static async update(groupId: string, userId: string, dto: Partial<CreateDto>) {
    const group = await prisma.quinielaGroup.findUnique({ where: { id: groupId } });
    if (!group) throw ApiError.notFound('Group');
    if (group.ownerId !== userId) throw ApiError.forbidden('Only the owner can update this group');

    return prisma.quinielaGroup.update({
      where: { id: groupId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.maxMembers !== undefined && { maxMembers: dto.maxMembers }),
        ...(dto.prizeDescription !== undefined && { prizeDescription: dto.prizeDescription }),
        ...(dto.matchPrizeEnabled !== undefined && { matchPrizeEnabled: dto.matchPrizeEnabled }),
        ...(dto.matchPrizeDefault !== undefined && { matchPrizeDefault: dto.matchPrizeDefault }),
        ...(dto.matchPrizeCustom !== undefined && { matchPrizeCustom: dto.matchPrizeCustom }),
      },
      include: groupInclude,
    });
  }

  static async removeMember(groupId: string, requesterId: string, targetUserId: string): Promise<void> {
    const group = await prisma.quinielaGroup.findUnique({ where: { id: groupId } });
    if (!group) throw ApiError.notFound('Group');
    if (group.ownerId !== requesterId) throw ApiError.forbidden('Only the owner can remove members');
    if (targetUserId === requesterId) throw ApiError.badRequest('Cannot remove yourself');

    await prisma.quinielaGroupMember.delete({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });
  }
}
