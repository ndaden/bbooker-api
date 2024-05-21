import { t } from "elysia";

export const createAppointmentType = t.Object({
  serviceId: t.String(),
  startTime: t.String(),
});
