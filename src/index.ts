import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { swaggerConfig } from "./configuration";
import { ElysiaSwaggerConfig } from "@elysiajs/swagger/dist/types";
import { jwt } from "@elysiajs/jwt";
import { authentification } from "./modules/authentication";
import { business } from "./modules/business";
import { appointment } from "./modules/appointment";
import { isMaintenance } from "./middlewares/maintenance";
import { buildApiResponse } from "./utils/api";
import { cors } from "@elysiajs/cors";

const app: Elysia = new Elysia()
  .use(
    jwt({
      name: "jwt",
      secret: Bun.env.JWT_SECRET!,
    })
  )
  .use(swagger(swaggerConfig as ElysiaSwaggerConfig))
  .onAfterHandle(({ set, headers }) => {
    set.headers["Access-Control-Allow-Origin"] = process.env.CORS_ORIGINS ?? "";
    set.headers["Access-Control-Allow-Credentials"] = "true";
    set.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
  })
  .use(cors({ origin: true }))
  .use(isMaintenance)
  .onError(({ error }) => {
    console.log(error);
    return buildApiResponse(false, "An error occured, please contact admin.");
  })
  .get(
    "/",
    () => {
      return "Welcome to BBooker.";
    },
    { detail: { tags: ["app"] } }
  )
  .use(authentification)
  .use(business)
  .use(appointment)
  .listen(3002, ({ hostname, port }) => {
    console.log(`🦊 Elysia is running at ${hostname}:${port}`);
  });
