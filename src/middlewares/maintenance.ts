import { Elysia } from "elysia";
import { buildApiResponse } from "../utils/api";

export const isMaintenance = (app: Elysia) =>
  app.onBeforeHandle(async ({ set }) => {
    if(process.env.MAINTENANCE_MODE) {
        set.status = 500
        return buildApiResponse(false, process.env.MAINTENANCE_MODE)
    }
  });