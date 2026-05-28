import { Body, Controller } from '@nestjs/common';
import { CreateUserDto } from './dto/createUser.dto';
import { UserService } from './user.service';
import { ApiResponse } from '@/common/types/api-response';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  async createUser(@Body() dto: CreateUserDto): Promise<ApiResponse> {
    const user = await this.userService.createUser(dto);

    return {
      message: 'User registered successfully',
      data: user,
      meta: {
        otpSendStatus: 'queued',
      },
    };
  }
}
