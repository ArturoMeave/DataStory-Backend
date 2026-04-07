import { Router, type Request, type Response } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { findOrCreateGoogleUser } from "../services/google.service";

const router = Router();

// Configuramos la estrategia de Google
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.APP_URL_BACKEND ?? "http://localhost:3001"}/api/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;

        if (!email) {
          return done(
            new Error("No se pudo obtener el email de Google"),
            undefined,
          );
        }

        const result = await findOrCreateGoogleUser({
          googleId: profile.id,
          email,
          name,
        });

        done(null, result);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  ),
);

// Ruta 1: el usuario pulsa "Continuar con Google"
// Le pedimos a Google el email y el nombre
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);

// Ruta 2: Google nos devuelve al usuario tras autenticarse
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth?error=google",
  }),
  (req: Request, res: Response) => {
    // req.user contiene { token, user } gracias al done(null, result) de arriba
    const { token, user } = req.user as {
      token: string;
      user: { id: string; email: string; name: string | null };
    };

    const frontendUrl = process.env.APP_URL ?? "http://localhost:5173";

    // Redirigimos al frontend con el token y los datos del usuario en la URL
    const params = new URLSearchParams({
      token,
      id: user.id,
      email: user.email,
      name: user.name ?? "",
    });

    res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
  },
);

export default router;
