import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const signInInput = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

const registerInput = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
});

export const getCurrentAccount = createServerFn().handler(async () => {
  const auth = await import("./auth.server");
  return auth.getCurrentAccount();
});

export const signIn = createServerFn({ method: "POST" })
  .validator(signInInput)
  .handler(async ({ data }) => {
    const auth = await import("./auth.server");
    return auth.signIn({ data });
  });

export const registerCustomer = createServerFn({ method: "POST" })
  .validator(registerInput)
  .handler(async ({ data }) => {
    const auth = await import("./auth.server");
    return auth.registerCustomer({ data });
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await import("./auth.server");
  return auth.signOut();
});
