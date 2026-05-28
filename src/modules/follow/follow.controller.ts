import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FollowService } from './follow.service';
import {
  CreateFollowDto,
  UnfollowDto,
  BlockUserDto,
  QueryGetFollowersDto,
} from './dto/follow.dto';
import { ApiResponse } from '@/common/types/api-response';
import { CurrentUser } from '@/common/decorators';
import { JwtGuard } from '@/common/guards';

@Controller('follow')
@UseGuards(JwtGuard)
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  /**
   * Send a follow request to a user
   * POST /follow
   */
  @Post()
  async sendFollowRequest(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateFollowDto,
  ): Promise<ApiResponse> {
    const result = await this.followService.sendFollowRequest(userId, dto);

    return {
      message: 'Follow request sent successfully',
      data: result,
    };
  }

  /**
   * Accept a follow request
   * POST /follow/:followerId/accept
   */
  @Post(':followerId/accept')
  async acceptFollowRequest(
    @CurrentUser('id') userId: number,
    @Param('followerId', ParseIntPipe) followerId: number,
  ): Promise<ApiResponse> {
    const result = await this.followService.acceptFollowRequestById(
      userId,
      followerId,
    );

    return {
      message: 'Follow request accepted',
      data: result,
    };
  }

  /**
   * Reject a follow request
   * POST /follow/:followerId/reject
   */
  @Post(':followerId/reject')
  async rejectFollowRequest(
    @CurrentUser('id') userId: number,
    @Param('followerId', ParseIntPipe) followerId: number,
  ): Promise<ApiResponse> {
    const result = await this.followService.rejectFollowRequest(
      userId,
      followerId,
    );

    return {
      message: 'Follow request rejected',
      data: result,
    };
  }

  /**
   * Unfollow a user
   * DELETE /follow/:followingId
   */
  @Delete(':followingId')
  async unfollow(
    @CurrentUser('id') userId: number,
    @Param('followingId', ParseIntPipe) followingId: number,
  ): Promise<ApiResponse> {
    const result = await this.followService.unfollow(userId, {
      followingId,
    });

    return {
      message: result.message,
      data: null,
    };
  }

  /**
   * Block a user
   * POST /follow/:followingId/block
   */
  @Post(':followingId/block')
  async blockUser(
    @CurrentUser('id') userId: number,
    @Param('followingId', ParseIntPipe) followingId: number,
  ): Promise<ApiResponse> {
    const result = await this.followService.blockUser(userId, {
      followingId,
    });

    return {
      message: 'User blocked successfully',
      data: result,
    };
  }

  /**
   * Unblock a user
   * DELETE /follow/:followingId/block
   */
  @Delete(':followingId/block')
  async unblockUser(
    @CurrentUser('id') userId: number,
    @Param('followingId', ParseIntPipe) followingId: number,
  ): Promise<ApiResponse> {
    const result = await this.followService.unblockUser(userId, followingId);

    return {
      message: result.message,
      data: null,
    };
  }

  /**
   * Get followers list
   * GET /follow/me/followers
   */
  @Get('me/followers')
  async getFollowers(
    @CurrentUser('id') userId: number,
    @Query() query: QueryGetFollowersDto,
  ): Promise<ApiResponse> {
    const [follower, total] = await this.followService.getFollowers(
      userId,
      query.page,
      query.limit,
    );

    return {
      message: 'Followers fetched successfully',
      data: follower,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Get following list
   * GET /follow/me/following
   */
  @Get('me/following')
  async getFollowing(
    @CurrentUser('id') userId: number,
    @Query() query: QueryGetFollowersDto,
  ): Promise<ApiResponse> {
    const skip = (query.page - 1) * query.limit;
    const result = await this.followService.getFollowing(
      userId,
      skip,
      query.limit,
    );

    return {
      message: 'Following list fetched successfully',
      data: result.data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.pagination.total,
        totalPages: Math.ceil(result.pagination.total / query.limit),
      },
    };
  }

  /**
   * Get pending follow requests
   * GET /follow/me/pending
   */
  @Get('me/pending')
  async getPendingRequests(
    @CurrentUser('id') userId: number,
    @Query() query: QueryGetFollowersDto,
  ): Promise<ApiResponse> {
    const skip = (query.page - 1) * query.limit;
    const result = await this.followService.getPendingRequests(
      userId,
      skip,
      query.limit,
    );

    return {
      message: 'Pending requests fetched successfully',
      data: result.data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.pagination.total,
        totalPages: Math.ceil(result.pagination.total / query.limit),
      },
    };
  }

  /**
   * Get blocked users
   * GET /follow/me/blocked
   */
  @Get('me/blocked')
  async getBlockedUsers(
    @CurrentUser('id') userId: number,
    @Query() query: QueryGetFollowersDto,
  ): Promise<ApiResponse> {
    const skip = (query.page - 1) * query.limit;
    const result = await this.followService.getBlockedUsers(
      userId,
      skip,
      query.limit,
    );

    return {
      message: 'Blocked users fetched successfully',
      data: result.data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.pagination.total,
        totalPages: Math.ceil(result.pagination.total / query.limit),
      },
    };
  }

  /**
   * Check follow status with another user
   * GET /follow/:userId/status
   */
  @Get(':userId/status')
  async checkFollowStatus(
    @CurrentUser('id') currentUserId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<ApiResponse> {
    const result = await this.followService.checkFollowStatus(
      currentUserId,
      userId,
    );

    return {
      message: 'Follow status retrieved',
      data: result,
    };
  }

  /**
   * Get follower count for a user
   * GET /follow/:userId/follower-count
   */
  @Get(':userId/follower-count')
  async getFollowerCount(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<ApiResponse> {
    const result = await this.followService.getFollowerCount(userId);

    return {
      message: 'Follower count retrieved',
      data: result,
    };
  }

  /**
   * Get following count for a user
   * GET /follow/:userId/following-count
   */
  @Get(':userId/following-count')
  async getFollowingCount(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<ApiResponse> {
    const message = 'Following count retrieved';

    const result = await this.followService.getFollowingCount(userId);

    return {
      message,
      data: result,
    };
  }
}
