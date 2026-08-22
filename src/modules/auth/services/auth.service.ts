import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateAdminToken, type AdminRole } from "@/lib/auth";
import type { LoginInput } from "../schemas/auth.schema";

export const authService = {
  async login(input: LoginInput) {
    const admin = await prisma.admin.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!admin) {
      return { success: false as const, message: "Invalid email or password" };
    }

    const isMatch = await bcrypt.compare(input.password, admin.password);
    if (!isMatch) {
      return { success: false as const, message: "Invalid email or password" };
    }

    const role = (admin.role === "super_admin"
      ? "super_admin"
      : "admin") as AdminRole;
    const token = await generateAdminToken(admin.email, admin.id, role);

    return {
      success: true as const,
      message: "Login successful",
      token,
      admin: { id: admin.id, email: admin.email, role },
    };
  },

  async changePassword(
    adminEmail: string,
    currentPassword: string,
    newPassword: string
  ) {
    const admin = await prisma.admin.findUnique({
      where: { email: adminEmail },
    });
    if (!admin) {
      return { success: false as const, message: "Account not found" };
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return {
        success: false as const,
        message: "Current password is incorrect",
      };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
    });

    return { success: true as const, message: "Password updated successfully" };
  },
};
