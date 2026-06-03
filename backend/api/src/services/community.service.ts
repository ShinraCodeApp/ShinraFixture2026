import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';

interface CreatePostDto {
  title: string;
  content: string;
  category: string;
}

export class CommunityService {
  static async listPosts(params: { category?: string; search?: string; page: number; limit: number }) {
    const where: Prisma.ForumPostWhereInput = {};
    if (params.category) where.category = params.category;
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { content: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const skip = (params.page - 1) * params.limit;
    const [items, total] = await Promise.all([
      prisma.forumPost.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, displayName: true, avatar: true, level: true } },
          _count: { select: { replies: true } },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: params.limit,
      }),
      prisma.forumPost.count({ where }),
    ]);

    return { items, pagination: { page: params.page, limit: params.limit, total, pages: Math.ceil(total / params.limit) } };
  }

  static async createPost(userId: string, dto: CreatePostDto) {
    if (!dto.title?.trim() || !dto.content?.trim()) throw ApiError.badRequest('Title and content required');
    if (dto.title.length > 200) throw ApiError.badRequest('Title too long');
    if (dto.content.length > 5000) throw ApiError.badRequest('Content too long');

    return prisma.forumPost.create({
      data: { title: dto.title.trim(), content: dto.content.trim(), category: dto.category, userId },
      include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });
  }

  static async getPost(id: string) {
    const post = await prisma.forumPost.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatar: true, level: true } },
        replies: {
          where: { parentId: null },
          include: {
            user: { select: { id: true, username: true, displayName: true, avatar: true } },
            _count: { select: { replies: true } },
          },
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
        _count: { select: { replies: true } },
      },
    });

    if (post) {
      await prisma.forumPost.update({ where: { id }, data: { viewsCount: { increment: 1 } } });
    }

    return post;
  }

  static async addReply(postId: string, userId: string, content: string, parentId?: string) {
    if (!content?.trim()) throw ApiError.badRequest('Reply cannot be empty');
    if (content.length > 2000) throw ApiError.badRequest('Reply too long');

    return prisma.forumReply.create({
      data: { postId, userId, content: content.trim(), parentId },
      include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });
  }

  static async deletePost(id: string, userId: string, role: string): Promise<void> {
    const post = await prisma.forumPost.findUnique({ where: { id } });
    if (!post) throw ApiError.notFound('Post');
    if (post.userId !== userId && !['ADMIN', 'MODERATOR', 'SUPER_ADMIN'].includes(role)) {
      throw ApiError.forbidden('Cannot delete this post');
    }
    await prisma.forumPost.delete({ where: { id } });
  }

  static async listPolls(matchId?: string) {
    const where: Prisma.PollWhereInput = { isActive: true };
    if (matchId) where.matchId = matchId;
    else where.matchId = null;

    return prisma.poll.findMany({
      where,
      include: { _count: { select: { votes: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  static async getPoll(id: string, userId?: string) {
    const poll = await prisma.poll.findUnique({
      where: { id },
      include: { _count: { select: { votes: true } } },
    });

    if (!poll) return null;

    // Count votes per option
    const voteCounts = await prisma.pollVote.groupBy({
      by: ['option'],
      where: { pollId: id },
      _count: true,
    });

    const userVote = userId
      ? await prisma.pollVote.findUnique({ where: { pollId_userId: { pollId: id, userId } } })
      : null;

    return {
      ...poll,
      voteCounts: voteCounts.reduce((acc: Record<number, number>, v) => {
        acc[v.option] = v._count;
        return acc;
      }, {}),
      userVote: userVote?.option ?? null,
    };
  }

  static async vote(pollId: string, userId: string, option: number): Promise<void> {
    const poll = await prisma.poll.findUnique({ where: { id: pollId } });
    if (!poll || !poll.isActive) throw ApiError.badRequest('Poll not available');
    if (option < 0 || option >= poll.options.length) throw ApiError.badRequest('Invalid option');
    if (poll.expiresAt && poll.expiresAt < new Date()) throw ApiError.badRequest('Poll has expired');

    await prisma.pollVote.upsert({
      where: { pollId_userId: { pollId, userId } },
      update: { option },
      create: { pollId, userId, option },
    });
  }

  static async deleteComment(id: string, userId: string, role: string): Promise<void> {
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) throw ApiError.notFound('Comment');
    if (comment.userId !== userId && !['ADMIN', 'MODERATOR', 'SUPER_ADMIN'].includes(role)) {
      throw ApiError.forbidden('Cannot delete this comment');
    }
    await prisma.comment.update({ where: { id }, data: { isDeleted: true, content: '[deleted]' } });
  }

  static async reactToComment(commentId: string, userId: string, type: string): Promise<void> {
    const validTypes = ['LIKE', 'LOVE', 'FIRE', 'SAD', 'ANGRY'];
    if (!validTypes.includes(type)) throw ApiError.badRequest('Invalid reaction type');

    const existing = await prisma.reaction.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existing) {
      if (existing.type === type) {
        await prisma.reaction.delete({ where: { userId_commentId: { userId, commentId } } });
        await prisma.comment.update({ where: { id: commentId }, data: { likesCount: { decrement: 1 } } });
      } else {
        await prisma.reaction.update({ where: { userId_commentId: { userId, commentId } }, data: { type } });
      }
    } else {
      await prisma.reaction.create({ data: { userId, commentId, type } });
      await prisma.comment.update({ where: { id: commentId }, data: { likesCount: { increment: 1 } } });
    }
  }

  static async reportComment(commentId: string, userId: string, reason: string): Promise<void> {
    await prisma.comment.update({ where: { id: commentId }, data: { isFlagged: true } });
  }
}
