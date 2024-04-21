import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { swaggerConfig } from "./configuration";
import { ElysiaSwaggerConfig } from "@elysiajs/swagger/dist/types";
import { cookie } from "@elysiajs/cookie";
import { jwt } from "@elysiajs/jwt";
import { authentification } from "./modules/authentication";
import { business } from "./modules/business";
import { appointment } from "./modules/appointment";
import { isMaintenance } from "./middlewares/maintenance";
import { buildApiResponse } from "./utils/api";
import { cors } from "@elysiajs/cors";

const app: Elysia = new Elysia()
  .onAfterHandle(({ request, set }) => {
    set.headers["Access-Control-Allow-Methods"] =
      "GET, POST, PUT, DELETE, PATCH";

    // Only process CORS requests
    if (request.method !== "OPTIONS") return;

    const allowHeader = set.headers["Access-Control-Allow-Headers"];
    if (allowHeader === "*") {
      set.headers["Access-Control-Allow-Headers"] =
        request.headers.get("Access-Control-Request-Headers") ?? "";
    }
  })
  .use(cors())
  .use(isMaintenance)
  .onError(({ error }) => {
    console.log(error);
    return buildApiResponse(false, "An error occured, please contact admin.");
  })
  .get("/", () => "Welcome to BBooker.", { detail: { tags: ["app"] } })
  .use(
    jwt({
      name: "jwt",
      secret: Bun.env.JWT_SECRET!,
    })
  )
  .use(cookie())
  .use(swagger(swaggerConfig as ElysiaSwaggerConfig))
  .use(authentification)
  .use(business)
  .use(appointment)
  .listen(3002);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
