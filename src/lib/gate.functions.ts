import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { credentialsValid, getGateSession } from "./gate.server";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const login = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    if (!credentialsValid(data.username, data.password)) {
      return { ok: false as const };
    }
    const session = await getGateSession();
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getGateSession();
  await session.clear();
  return { ok: true as const };
});

export const getGateStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getGateSession();
  return { unlocked: Boolean(session.data.unlocked) };
});
