import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { UserRepository } from '../entity/user.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from '../entity/user.entity';
import { NewUserDto } from '../dto/new-user.dto';
import { createHash, createRandomToken } from '../util/security.util';
import { UserUpdateDto } from '../dto/update-user.dto';
import { AccessTokenPayloadDto } from '../dto/access-token-payload.dto';
import { AccessRefreshTokenDto } from '../dto/access-refresh-token.dto';
import { MailService } from '../../mail/mail.service';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ConfirmEmailDto } from '../dto/confirm-email.dto';
import { SetNewPasswordDto } from '../dto/set-new-password.dto';
import { ResetEmailConfirmationDto } from '../dto/reset-email-confirmation.dto';
import { RefreshTokenEntity } from '../entity/refresh-token.entity';
import { RefreshTokenPayloadDto } from '../dto/refresh-token-payload.dto';

import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name, true);

  private readonly FIFTEEN_MINUTES_IN_MILLISECONDS = 15 * 60 * 1000;

  constructor(
    @InjectRepository(UserRepository)
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async getUserById(id: string): Promise<UserEntity> {
    const result = await this.userRepository.findOne({ id, active: true });

    if (!result) {
      this.logger.warn(`No user found for ${id}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: ['no user found'],
          error: 'Not Found',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return result;
  }

  async signUp(
    newUserDto: NewUserDto,
  ): Promise<{ user: UserEntity; token: AccessRefreshTokenDto }> {
    const userWithEmail = await this.getUserByEmail(newUserDto.email);

    if (userWithEmail) {
      this.logger.warn(`Email already exists ${newUserDto.email}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.CONFLICT,
          message: ['email already exists'],
          error: 'Conflict',
        },
        HttpStatus.CONFLICT,
      );
    }

    const user = await this.userRepository.saveNewUser(newUserDto);

    this.logger.log(`Successfully registered new user with id '${user.id}'`);

    this.prepareSendingDoubleOptInEmail(user);

    const token = await this.signIn(user);

    return { user, token };
  }

  async getUserByEmail(email: string): Promise<UserEntity> {
    return this.userRepository.findOne({ email, active: true });
  }

  async signIn(userEntity: UserEntity): Promise<AccessRefreshTokenDto> {
    const accessTokenPayloadDto = new AccessTokenPayloadDto();
    accessTokenPayloadDto.sub = userEntity.id;

    const jwtId = uuidv4();

    const accessToken = this.jwtService.sign({ ...accessTokenPayloadDto }, { jwtid: jwtId });

    const refreshTokenPayloadDto = new RefreshTokenPayloadDto();
    refreshTokenPayloadDto.jwtId = jwtId;

    const refreshToken = this.jwtService.sign(
      { ...refreshTokenPayloadDto },
      {
        secret: process.env.JWT_REFRESH_TOKEN_SECRET,
        expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION,
      },
    );

    const validToken = userEntity.refreshToken.find(
      (refreshToken: RefreshTokenEntity) => refreshToken.active === true,
    );

    if (validToken) {
      validToken.active = false;
    }

    const refreshTokenEntity = new RefreshTokenEntity();
    refreshTokenEntity.token = refreshToken;

    userEntity.refreshToken.push(refreshTokenEntity);
    await userEntity.save();

    const accessRefreshTokenDto = new AccessRefreshTokenDto();
    accessRefreshTokenDto.accessToken = accessToken;
    accessRefreshTokenDto.refreshToken = refreshToken;

    return accessRefreshTokenDto;
  }

  async refresh(accessRefreshTokenDto: AccessRefreshTokenDto): Promise<AccessRefreshTokenDto> {
    const accessTokenPayloadDto = this.jwtService.verify<AccessTokenPayloadDto>(
      accessRefreshTokenDto.accessToken,
      { ignoreExpiration: true },
    );
    const refreshTokenPayloadDto = this.jwtService.verify<RefreshTokenPayloadDto>(
      accessRefreshTokenDto.refreshToken,
      { secret: process.env.JWT_REFRESH_TOKEN_SECRET, ignoreExpiration: true },
    );

    const userEntity = await this.getUserById(accessTokenPayloadDto.sub);

    const validToken = userEntity.refreshToken.find(
      (refreshToken: RefreshTokenEntity) => refreshToken.active === true,
    );

    if (!validToken) {
      this.logger.warn(`User doesn't have a stored valid refresh token`);

      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: ["user doesn't have a stored valid refresh token"],
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (validToken.token !== accessRefreshTokenDto.refreshToken) {
      this.logger.warn(`Received refresh token doesn't fit to saved refresh token for user`);

      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: ["received refresh token doesn't fit to saved refresh token for user"],
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (accessTokenPayloadDto['jti'] !== refreshTokenPayloadDto.jwtId) {
      this.logger.warn(`Refresh token and access token are not linked`);

      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: ['refresh token and access token are not linked'],
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (refreshTokenPayloadDto['exp'] < new Date().getTime() / 1000) {
      this.logger.warn(`Refresh token has already expired`);

      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: ['refresh token has already expired'],
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (accessTokenPayloadDto['exp'] > new Date().getTime() / 1000) {
      this.logger.warn(`Access token has not yet expired`);

      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: ['access token has not yet expired'],
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.signIn(userEntity);
  }

  async updateUser(userEntity: UserEntity, userUpdateDto: UserUpdateDto): Promise<UserEntity> {
    if (Object.keys(userUpdateDto).length === 0) {
      return userEntity;
    }

    if (userUpdateDto.email) {
      const userWithEmail = await this.getUserByEmail(userUpdateDto.email);

      if (userWithEmail) {
        this.logger.warn(`Email already exists ${userUpdateDto.email}`);
        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            message: ['email already exists'],
            error: 'Conflict',
          },
          HttpStatus.CONFLICT,
        );
      }

      userEntity.email = userUpdateDto.email;

      this.prepareSendingDoubleOptInEmail(userEntity);
    }
    if (userUpdateDto.username) {
      userEntity.username = userUpdateDto.username;
    }
    if (userUpdateDto.password) {
      userEntity.passwordHash = await createHash(userUpdateDto.password, 12);
    }

    this.logger.log(`Successfully updated user with id '${userEntity.id}'`);

    return await userEntity.save();
  }

  setUserInactive(userEntity: UserEntity): void {
    userEntity.active = false;

    this.logger.log(`Successfully deleted user with id '${userEntity.id}'`);

    userEntity.save();
  }

  async resetEmailConfirmation(
    resetEmailConfirmationDto: ResetEmailConfirmationDto,
  ): Promise<UserEntity> {
    const user = await this.getUserByEmail(resetEmailConfirmationDto.email);

    if (!user) {
      this.logger.warn(`No user found for ${resetEmailConfirmationDto.email}`);

      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: ['no user found'],
          error: 'Not Found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    this.prepareSendingDoubleOptInEmail(user);

    return user;
  }

  async confirmEmail(confirmEmailDto: ConfirmEmailDto): Promise<UserEntity> {
    const user = await this.getUserByEmail(confirmEmailDto.email);

    if (!user) {
      this.logger.warn(`No user found for ${confirmEmailDto.email}`);

      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: ['no user found'],
          error: 'Not Found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (user.doubleOptInConfirmedAt !== null) {
      this.logger.warn(`Email already confirmed ${confirmEmailDto.email}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.CONFLICT,
          message: ['email already confirmed'],
          error: 'Conflict',
        },
        HttpStatus.CONFLICT,
      );
    }

    if (user.doubleOptInToken !== confirmEmailDto.token) {
      this.logger.warn(`Token for confirmation is invalid ${confirmEmailDto.token}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.CONFLICT,
          message: ['token for confirmation is invalid'],
          error: 'Conflict',
        },
        HttpStatus.CONFLICT,
      );
    }

    user.doubleOptInConfirmedAt = new Date();

    this.logger.log(`Successfully confirmed ${confirmEmailDto.email}`);

    return await user.save();
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<UserEntity> {
    const user = await this.getUserByEmail(resetPasswordDto.email);

    if (!user) {
      this.logger.warn(`No user found for ${resetPasswordDto.email}`);

      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: ['no user found'],
          error: 'Not Found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    this.prepareSendingSetNewPasswordEmail(user);

    return user;
  }

  async setNewPassword(setNewPasswordDto: SetNewPasswordDto): Promise<UserEntity> {
    const user = await this.getUserByEmail(setNewPasswordDto.email);

    if (!user) {
      this.logger.warn(`No user found for ${setNewPasswordDto.email}`);

      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: ['no user found'],
          error: 'Not Found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (!user.resetPasswordInProgress) {
      this.logger.warn(`No password reset issued for ${setNewPasswordDto.email}`);

      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: ['no password reset issued'],
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (user.resetPasswordToken !== setNewPasswordDto.token) {
      this.logger.warn(`Token for setting new password is invalid ${setNewPasswordDto.token}`);

      throw new HttpException(
        {
          statusCode: HttpStatus.CONFLICT,
          message: ['token for setting new password is invalid'],
          error: 'Conflict',
        },
        HttpStatus.CONFLICT,
      );
    }

    if (
      new Date().getTime() - user.resetPasswordSentAt.getTime() >
      this.FIFTEEN_MINUTES_IN_MILLISECONDS
    ) {
      this.logger.warn(
        `Token for setting new password has already expired ${setNewPasswordDto.token}`,
      );

      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: ['token has already expired'],
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    user.passwordHash = await createHash(setNewPasswordDto.password, 12);
    user.resetPasswordInProgress = false;
    user.resetPasswordConfirmedAt = new Date();

    this.logger.log(`Successfully set new password for user with id '${user.id}'`);

    return await user.save();
  }

  private async prepareSendingSetNewPasswordEmail(userEntity: UserEntity): Promise<void> {
    const randomToken = createRandomToken(32);

    const success = await this.mailService.sendSetNewPasswordMail(userEntity.email, randomToken);

    if (success) {
      this.userRepository.setResetPasswordDetails(userEntity, randomToken);
    }
  }

  private async prepareSendingDoubleOptInEmail(userEntity: UserEntity): Promise<void> {
    const randomToken = createRandomToken(32);

    const success = await this.mailService.sendDoubleOptInMail(userEntity.email, randomToken);

    if (success) {
      this.userRepository.setDoubleOptInDetails(userEntity, randomToken);
    }
  }
}
