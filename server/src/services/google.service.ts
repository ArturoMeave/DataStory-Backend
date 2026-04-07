import { PrismaClient } from "@prisma/client";
import { generateToken } from "./auth.service";

const prisma = new PrismaClient();

export async function findOrCreateGoogleUser(profile: {
  googleId: string;
  email: string;
  name: string;
}): Promise<{
  token: string;
  user: { id: string; email: string; name: string | null };
}> {
  // Primero buscamos si ya existe un usuario con este googleId
  let user = await prisma.user.findUnique({
    where: { googleId: profile.googleId },
  });

  // Si no existe por googleId, buscamos por email
  // (puede que ya tuviera cuenta con email/contraseña)
  if (!user) {
    const existingByEmail = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingByEmail) {
      // Vinculamos el googleId a la cuenta existente
      user = await prisma.user.update({
        where: { email: profile.email },
        data: { googleId: profile.googleId },
      });
    } else {
      // Creamos un usuario nuevo con su workspace
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          googleId: profile.googleId,
          role: "ADMIN",
          workspace: {
            create: {
              name: `Empresa de ${profile.name}`,
            },
          },
        },
      });
    }
  }

  const token = generateToken(user.id, user.email);

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name },
  };
}
