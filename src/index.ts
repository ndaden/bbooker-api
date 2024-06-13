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
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generatePrompt } from "./utils/ai/prompts";

const genAI = new GoogleGenerativeAI(Bun.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: Bun.env.AI_SYSTEM_INSTRUCTION })

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
      return "Welcome to BBooker";
    },
    { detail: { tags: ["app"] } }
  )
  .use(authentification)
  .use(business)
  .use(appointment)
  .get(
    "/ai",
    async () => {
      const result = await model.generateContent(generatePrompt({ city: 'Bordeaux', services: 'coupe et coloriage des cheveux, manucure, pédicure', openingClosingDaysAndTimes: 'du lundi au vendredi de 10h à 18h' }));
      const response = await result.response;
      const text = response.text();

      const json = JSON.parse(text);
      return json;
    },
    { detail: { tags: ["app"] } }
  )
  .listen(3002, ({ hostname, port }) => {
    console.log(`🦊 Elysia is running at ${hostname}:${port}`);
  });
