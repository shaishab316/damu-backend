import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { CreateFollowDto, UnfollowDto, BlockUserDto } from './dto/follow.dto';

@Injectable()
export class FollowService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send a follow request
   */
  async sendFollowRequest(userId: number, dto: CreateFollowDto) {
    const { followingId } = dto;

    if (userId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    // Check if target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.isBanned) {
      throw new ForbiddenException('This user is banned');
    }

    // Check if already following or pending
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      if (!existingFollow.isPending && !existingFollow.isBlocked) {
        throw new BadRequestException('You are already following this user');
      }
      if (existingFollow.isPending) {
        throw new BadRequestException('Follow request already pending');
      }
      if (existingFollow.isBlocked) {
        throw new ForbiddenException('You have blocked this user');
      }
    }

    // Check if blocked by target user
    const blockedByUser = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: followingId,
          followingId: userId,
        },
      },
    });

    if (blockedByUser?.isBlocked) {
      throw new ForbiddenException('This user has blocked you');
    }

    const follow = await this.prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId,
        },
      },
      update: {
        isPending: true,
        isBlocked: false,
        requestedAt: new Date(),
      },
      create: {
        followerId: userId,
        followingId,
        isPending: true,
        isBlocked: false,
      },
      include: {
        follower: true,
        following: true,
      },
    });

    return {
      id: follow.followingId,
      status: 'pending',
      requestedAt: follow.requestedAt,
    };
  }

  /**
   * Accept a specific follow request by follower ID
   */
  async acceptFollowRequestById(userId: number, followerId: number) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException('Follow request not found');
    }

    if (!follow.isPending) {
      throw new BadRequestException('This follow request is not pending');
    }

    const updated = await this.prisma.follow.update({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userId,
        },
      },
      data: {
        isPending: false,
        acceptedAt: new Date(),
      },
    });

    return {
      id: updated.followingId,
      status: 'accepted',
      acceptedAt: updated.acceptedAt,
    };
  }

  /**
   * Reject a follow request
   */
  async rejectFollowRequest(userId: number, followerId: number) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException('Follow request not found');
    }

    if (!follow.isPending) {
      throw new BadRequestException('This follow request is not pending');
    }

    await this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userId,
        },
      },
    });

    return {
      message: 'Follow request rejected',
    };
  }

  /**
   * Unfollow a user
   */
  async unfollow(userId: number, dto: UnfollowDto) {
    const { followingId } = dto;

    if (userId === followingId) {
      throw new BadRequestException('Invalid operation');
    }

    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException('Not following this user');
    }

    await this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId,
        },
      },
    });

    return {
      message: 'Unfollowed successfully',
    };
  }

  /**
   * Block a user
   */
  async blockUser(userId: number, dto: BlockUserDto) {
    const { followingId } = dto;

    if (userId === followingId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const follow = await this.prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId,
        },
      },
      update: {
        isBlocked: true,
        isPending: false,
      },
      create: {
        followerId: userId,
        followingId,
        isBlocked: true,
        isPending: false,
      },
    });

    return {
      id: follow.followingId,
      status: 'blocked',
    };
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: number, followingId: number) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException('User not blocked');
    }

    if (!follow.isBlocked) {
      throw new BadRequestException('User is not blocked');
    }

    await this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId,
        },
      },
    });

    return {
      message: 'User unblocked successfully',
    };
  }

  /**
   * Get followers list
   */
  async getFollowers(userId: number, page: number, limit: number) {
    return await Promise.all([
      this.prisma.follow.findMany({
        where: {
          followingId: userId,
          isBlocked: false,
          isPending: false,
        },
        include: {
          follower: {
            select: {
              id: true,
              isActive: true,
              isBanned: true,
            },
          },
        },
        skip: page * limit - 1,
        take: limit,
        orderBy: {
          acceptedAt: 'desc',
        },
      }),
      this.prisma.follow.count({
        where: {
          followingId: userId,
          isBlocked: false,
          isPending: false,
        },
      }),
    ]);
  }

  /**
   * Get following list
   */
  async getFollowing(userId: number, skip: number = 0, take: number = 20) {
    const following = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
        isBlocked: false,
        isPending: false,
      },
      include: {
        following: {
          select: {
            id: true,
            isActive: true,
            isBanned: true,
          },
        },
      },
      skip,
      take,
      orderBy: {
        acceptedAt: 'desc',
      },
    });

    const total = await this.prisma.follow.count({
      where: {
        followerId: userId,
        isBlocked: false,
        isPending: false,
      },
    });

    return {
      data: following.map((f) => ({
        id: f.following.id,
        followedAt: f.acceptedAt,
      })),
      pagination: {
        total,
        skip,
        take,
      },
    };
  }

  /**
   * Get pending follow requests
   */
  async getPendingRequests(
    userId: number,
    skip: number = 0,
    take: number = 20,
  ) {
    const requests = await this.prisma.follow.findMany({
      where: {
        followingId: userId,
        isPending: true,
        isBlocked: false,
      },
      include: {
        follower: {
          select: {
            id: true,
            isActive: true,
            isBanned: true,
            name: true,
          },
        },
      },
      skip,
      take,
      orderBy: {
        requestedAt: 'desc',
      },
    });

    const total = await this.prisma.follow.count({
      where: {
        followingId: userId,
        isPending: true,
        isBlocked: false,
      },
    });

    return {
      data: requests.map((f) => ({
        id: f.follower.id,
        requestedAt: f.requestedAt,
      })),
      pagination: {
        total,
        skip,
        take,
      },
    };
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(userId: number, skip: number = 0, take: number = 20) {
    const blocked = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
        isBlocked: true,
      },
      include: {
        following: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
      skip,
      take,
      orderBy: {
        requestedAt: 'desc',
      },
    });

    const total = await this.prisma.follow.count({
      where: {
        followerId: userId,
        isBlocked: true,
      },
    });

    return {
      data: blocked.map((f) => ({
        id: f.following.id,
      })),
      pagination: {
        total,
        skip,
        take,
      },
    };
  }

  /**
   * Check follow status between two users
   */
  async checkFollowStatus(userId: number, targetUserId: number) {
    const [followStatus, followerStatus] = await Promise.all([
      this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId,
          },
        },
      }),
      this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: targetUserId,
            followingId: userId,
          },
        },
      }),
    ]);

    return {
      isFollowing:
        followStatus && !followStatus.isPending && !followStatus.isBlocked,
      isFollowingPending: followStatus?.isPending || false,
      isBlocked: followStatus?.isBlocked || false,
      isFollowedBy:
        followerStatus &&
        !followerStatus.isPending &&
        !followerStatus.isBlocked,
      isFollowedByPending: followerStatus?.isPending || false,
    };
  }

  /**
   * Get follower count
   */
  async getFollowerCount(userId: number) {
    const count = await this.prisma.follow.count({
      where: {
        followingId: userId,
        isBlocked: false,
        isPending: false,
      },
    });

    return { count };
  }

  /**
   * Get following count
   */
  async getFollowingCount(userId: number) {
    const count = await this.prisma.follow.count({
      where: {
        followerId: userId,
        isBlocked: false,
        isPending: false,
      },
    });

    return { count };
  }
}
