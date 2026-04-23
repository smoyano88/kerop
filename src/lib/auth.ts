import { prisma } from './prisma';

export const ADMIN_PASSWORD_KEY = 'admin_password';
export const DEFAULT_ADMIN_PASSWORD = 'Kerop2024';

export async function getAdminPassword(): Promise<string> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: ADMIN_PASSWORD_KEY },
    });
    return setting?.value || DEFAULT_ADMIN_PASSWORD;
  } catch (error) {
    console.error('Error fetching admin password from DB:', error);
    return DEFAULT_ADMIN_PASSWORD;
  }
}

export async function verifyAdminPassword(password: string | null | undefined): Promise<boolean> {
  if (!password) return false;
  const currentPassword = await getAdminPassword();
  return password === currentPassword;
}
