import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserService } from '../service/user.service';
import { AccessTokenPayloadDto } from '../dto/access-token-payload.dto';
import { UserEntity } from '../entity/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_TOKEN_SECRET,
    });
  }

  async validate(
    accessTokenPayload: AccessTokenPayloadDto,
  ): Promise<UserEntity> {
    const user = await this.userService.getUserById(accessTokenPayload.sub);
    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          message: ['invalid credentials'],
          error: 'Unauthorized',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    return user;
  }
}
