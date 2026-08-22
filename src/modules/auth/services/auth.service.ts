import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateAdminToken } from "@/lib/auth";

export const authService = {
  async login(email: string, password: string) {
    if (!email || !password) {
      return { success: false, message: "Email and password are required" };
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return { success: false, message: "Invalid credentials" };
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return { success: false, message: "Invalid credentials" };
    }

    const token = await generateAdminToken(admin.email);

    return {
      success: true,
      message: "Login successful",
      token,
      admin: { email: admin.email },
    };
  },
};
