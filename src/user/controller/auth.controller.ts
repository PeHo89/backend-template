import {
  Body,
  Controller,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { serialize } from 'class-transformer';
import { AuthGuard } from '@nestjs/passport';
import { AccessRefreshTokenDto } from '../dto/access-refresh-token.dto';
import { UserService } from '../service/user.service';
import { NewUserDto } from '../dto/new-user.dto';
import { UserEntity } from '../entity/user.entity';
import { GetUser } from '../auth/get-user.decorator';
import { LoginUserDto } from '../dto/login-user.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name, true);

  constructor(private readonly userService: UserService) {}

  @ApiExtraModels(LoginUserDto)
  @ApiBody({
    schema: {
      title: LoginUserDto.name,
      allOf: [{ $ref: getSchemaPath(LoginUserDto) }],
    },
  })
  @Post('sign-in')
  @UseGuards(AuthGuard('local'))
  signIn(@GetUser() userEntity: UserEntity): Promise<AccessRefreshTokenDto> {
    return this.userService.signIn(userEntity);
  }

  @Post('sign-up')
  async signUp(
    @Body() newUserDto: NewUserDto,
  ): Promise<{ user: { [key: string]: any }; token: AccessRefreshTokenDto }> {
    const { user, token } = await this.userService.signUp(newUserDto);

    // make use of ClassSerializerInterceptor for user property of response object
    return { user: JSON.parse(serialize(user)), token };
  }

  @Post('refresh')
  refresh(@Body() accessRefreshTokenDto: AccessRefreshTokenDto): Promise<AccessRefreshTokenDto> {
    return this.userService.refresh(accessRefreshTokenDto);
  }
}
