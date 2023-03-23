import { AAAUser } from "../types";

export default class UserService {
  async getUsers(): Promise<AAAUser[]> {
    throw new Error("Not implemented");
  }

  async getUserByUsername(username: string): Promise<AAAUser> {
    throw new Error("Not implemented");
  }

  async getUserByEmail(email: string): Promise<AAAUser> {
    throw new Error("Not implemented");
  }

  async saveUser(user: AAAUser): Promise<AAAUser> {
    throw new Error("Not implemented");
  }

  async updateUser(user: AAAUser): Promise<void> {
    throw new Error("Not implemented");
  }

  async updateDisabled(username: string, disabled: boolean): Promise<void> {
    throw new Error("Not implemented");
  }
}
