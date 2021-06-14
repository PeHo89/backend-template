import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserEntity } from '../entity/user.entity';

export const GetUser = createParamDecorator(
  (data, ctx: ExecutionContext): UserEntity => {
    return ctx.switchToHttp().getRequest().user;
  },
);
