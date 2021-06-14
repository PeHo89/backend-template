import { Test } from '@nestjs/testing';
import { UserService } from '../../src/user/service/user.service';
import { UserRepository } from '../../src/user/entity/user.repository';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../src/mail/mail.service';
import { UserEntity } from '../../src/user/entity/user.entity';
import { HttpException } from '@nestjs/common';

describe('UserService', () => {
  let userService;
  let userRepository;
  let jwtService;
  let mailService;

  const userMock: UserEntity = {
    id: 'abc123',
    username: 'test_user',
    email: 'test@user.com',
    active: true,
    passwordHash: '0xdeadbeef',
  } as UserEntity;

  const userRepositoryMock = () => ({
    findOne: jest.fn(),
    saveNewUser: jest.fn(),
    setResetPasswordDetails: jest.fn(),
    setDoubleOptInDetails: jest.fn(),
  });

  const jwtServiceMock = () => ({
    sign: jest.fn(),
  });

  const mailServiceMock = () => ({
    sendSetNewPasswordMail: jest.fn(),
    sendDoubleOptInMail: jest.fn(),
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useFactory: userRepositoryMock,
        },
        {
          provide: JwtService,
          useFactory: jwtServiceMock,
        },
        {
          provide: MailService,
          useFactory: mailServiceMock,
        },
      ],
    }).compile();

    userService = moduleRef.get<UserService>(UserService);
    userRepository = moduleRef.get<UserRepository>(UserRepository);
    jwtService = moduleRef.get<JwtService>(JwtService);
    mailService = moduleRef.get<MailService>(MailService);
  });

  describe('getUserById', () => {
    it('should return a user', async () => {
      userRepository.findOne.mockResolvedValue(userMock);

      const user = await userService.getUserById(userMock.id);

      expect(user).toBe(userMock);
    });

    it('should throw an exception (404 - not found)', () => {
      userRepository.findOne.mockResolvedValue(undefined);

      expect(userService.getUserById(userMock.id)).rejects.toThrow(HttpException);
    });
  });
});
