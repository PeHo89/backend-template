import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserService } from '../service/user.service';
import { UserEntity } from '../entity/user.entity';
import { verifyHash } from '../util/security.util';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private userService: UserService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<UserEntity> {
    const user = await this.userService.getUserByEmail(email);

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

    const passwordsMatch = await verifyHash(password, user.passwordHash);

    if (!passwordsMatch) {
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
