import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
  Logger,
  Delete,
  Put,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from '../service/user.service';
import { AuthGuard } from '@nestjs/passport';
import { UserEntity } from '../entity/user.entity';
import { UserUpdateDto } from '../dto/update-user.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/get-user.decorator';
import { ConfirmEmailDto } from '../dto/confirm-email.dto';
import { SetNewPasswordDto } from '../dto/set-new-password.dto';
import { ResetEmailConfirmationDto } from '../dto/reset-email-confirmation.dto';

@ApiTags('user')
@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name, true);

  constructor(private readonly userService: UserService) {}

  @ApiBearerAuth()
  @Get()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(ClassSerializerInterceptor)
  getUserById(@GetUser() userEntity: UserEntity): UserEntity {
    return userEntity;
  }

  @ApiBearerAuth()
  @Patch()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(ClassSerializerInterceptor)
  updateUserById(
    @GetUser() userEntity: UserEntity,
    @Body() userUpdateDto: UserUpdateDto,
  ): Promise<UserEntity> {
    return this.userService.updateUser(userEntity, userUpdateDto);
  }

  @ApiBearerAuth()
  @Delete()
  @UseGuards(AuthGuard('jwt'))
  deleteUserById(@GetUser() userEntity: UserEntity): void {
    return this.userService.setUserInactive(userEntity);
  }

  @Put('reset-email-confirmation')
  @UseInterceptors(ClassSerializerInterceptor)
  async resetEmailConfirmation(
    @Body() resetEmailConfirmationDto: ResetEmailConfirmationDto,
  ): Promise<UserEntity> {
    return this.userService.resetEmailConfirmation(resetEmailConfirmationDto);
  }

  @Put('confirm-email')
  @UseInterceptors(ClassSerializerInterceptor)
  async confirmEmail(
    @Body() confirmEmailDto: ConfirmEmailDto,
  ): Promise<UserEntity> {
    return this.userService.confirmEmail(confirmEmailDto);
  }

  @Put('reset-password')
  @UseInterceptors(ClassSerializerInterceptor)
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<UserEntity> {
    return this.userService.resetPassword(resetPasswordDto);
  }

  @Put('set-new-password')
  @UseInterceptors(ClassSerializerInterceptor)
  async setNewPassword(
    @Body() setNewPasswordDto: SetNewPasswordDto,
  ): Promise<UserEntity> {
    return this.userService.setNewPassword(setNewPasswordDto);
  }
}
