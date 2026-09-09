import type { PasswordHasherPort } from "@/core/user/application/port/out/PasswordHasherPort.ts";
import * as bcrypt from "@felix/bcrypt";

export class BcryptPasswordHasherAdapter implements PasswordHasherPort {
  hash(password: string): Promise<string> {
    return bcrypt.hash(password);
  }
  verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.verify(password, hash);
  }
}
