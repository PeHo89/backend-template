import { EntityRepository, Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { createHash } from '../util/security.util';
import { NewUserDto } from '../dto/new-user.dto';

@EntityRepository(UserEntity)
export class UserRepository extends Repository<UserEntity> {
  async saveNewUser(newUserDto: NewUserDto): Promise<UserEntity> {
    const user = this.create();

    user.email = newUserDto.email;
    user.passwordHash = await createHash(newUserDto.password, 12);
    user.refreshToken = [];

    return user.save();
  }

  async setDoubleOptInDetails(
    savedUser: UserEntity,
    randomToken: string,
  ): Promise<void> {
    savedUser.doubleOptInToken = randomToken;
    savedUser.doubleOptInSentAt = new Date();
    savedUser.doubleOptInConfirmedAt = null;

    await savedUser.save();
  }

  async setResetPasswordDetails(
    savedUser: UserEntity,
    randomToken: string,
  ): Promise<void> {
    savedUser.resetPasswordToken = randomToken;
    savedUser.resetPasswordSentAt = new Date();
    savedUser.resetPasswordInProgress = true;

    await savedUser.save();
  }
}
