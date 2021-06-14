import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AccessRefreshTokenDto {
  @ApiProperty()
  @IsString()
  accessToken: string;

  @ApiProperty()
  @IsString()
  refreshToken: string;
}
