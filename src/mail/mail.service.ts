import { Logger, Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Options } from 'nodemailer/lib/smtp-connection';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name, true);

  private mailAccount = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_CONNECTION_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  } as Options);

  public async sendDoubleOptInMail(
    email: string,
    randomToken: string,
  ): Promise<boolean> {
    try {
      const hostPort = process.env.APP_PORT ? `${process.env.APP_HOST}:${process.env.APP_PORT}` : process.env.APP_HOST;

      await this.mailAccount.sendMail({
        from: `"${process.env.APP_NAME}" <${process.env.APP_EMAIL}>`,
        to: email,
        subject: 'Please confirm your email',
        text: `
        Please send the following data along with a PUT request to '${process.env.APP_PROTOCOL}://${hostPort}/${process.env.API_PREFIX}/user/confirm-email':
        
        email=${email}
        token=${randomToken}
        
        We are happy to have you on board!`,
      });
      this.logger.log(
        `Successfully sent email for double opt in to '${email}'`,
      );
      return true;
    } catch (e) {
      this.logger.error(
        `Failed sending email for double opt in to '${email}': ${e.message}`,
      );
      return false;
    }
  }

  public async sendSetNewPasswordMail(
    email: string,
    randomToken: string,
  ): Promise<boolean> {
    const hostPort = process.env.APP_PORT ? `${process.env.APP_HOST}:${process.env.APP_PORT}` : process.env.APP_HOST;

    try {
      await this.mailAccount.sendMail({
        from: `"${process.env.APP_NAME}" <${process.env.APP_EMAIL}>`,
        to: email,
        subject: 'Please set new password',
        text: `
        Please send the following data along with a PUT request to '${process.env.APP_PROTOCOL}://${hostPort}/${process.env.API_PREFIX}/user/set-new-password' within the next 15 minutes:
        
        email=${email}
        token=${randomToken}
        password=[your_new_password_here]
        
        We are happy to see you again soon!`,
      });
      this.logger.log(
        `Successfully sent email for setting new password to '${email}'`,
      );
      return true;
    } catch (e) {
      this.logger.error(
        `Failed sending email for setting new password to '${email}': ${e.message}`,
      );
      return false;
    }
  }
}
