import { Elysia, t } from "elysia";
import { isAuthenticated } from "../../middlewares/authentication";
import { createAppointmentType } from "./types";
import { prisma } from "../../libs/prisma";
import { buildApiResponse } from "../../utils/api";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isBetween);

export const appointment = (app: Elysia) =>
  app.group("/appointment", (app) =>
    app
      .use(isAuthenticated)
      .get(
        "/",
        async ({ account, query }) => {
          // TODO
          // 1 - standard user must be able to fetch only the list of his appointments
          // 2 - owner must be able to fetch the list of appointment with services associated to his business

          if (!account) {
            return buildApiResponse(false, "unauthorized");
          }

          const { serviceId, accountId } = query;

          let foundAppointments;

          if (serviceId) {
            foundAppointments = await prisma.appointment.findMany({
              where: {
                serviceId,
              },
            });
          }

          if (accountId && accountId === account.id) {
            foundAppointments = await prisma.appointment.findMany({
              where: {
                accountId,
              },
            });
          }

          foundAppointments = await prisma.appointment.findMany();

          return buildApiResponse(true, "appointments", foundAppointments);
        },
        {
          query: t.Optional(
            t.Object({
              serviceId: t.Optional(t.String()),
              accountId: t.Optional(t.String()),
            })
          ),
          detail: { tags: ["appointment"] },
        }
      )
      .get(
        "/slots/:businessId",
        async ({ params, query }) => {
          const { businessId } = params;
          const { startTimeInterval, endTimeInterval, slotDurationInMinutes } =
            query;

          let slots = [];

          if (businessId) {
            const appointmentsForBusiness = await prisma.appointment.findMany({
              where: {
                service: {
                  businessId: businessId,
                },
              },
            });

            let startInterval = dayjs.unix(Number(startTimeInterval));
            const endInterval = dayjs.unix(Number(endTimeInterval));

            while (startInterval.isBefore(endInterval)) {
              if (
                startInterval.hour() >= 8 &&
                startInterval.isBefore(
                  startInterval
                    .hour(19)
                    .subtract(Number(slotDurationInMinutes), "minutes")
                )
              ) {
                const slotFree = !appointmentsForBusiness.find((appt) =>
                  startInterval.isBetween(
                    appt.startTime,
                    appt.endTime,
                    "minutes",
                    "[)"
                  )
                );
                slots.push({
                  free: slotFree,
                  startTime: startInterval,
                  endTime: startInterval.add(
                    Number(slotDurationInMinutes),
                    "minutes"
                  ),
                });
              }
              startInterval = startInterval.add(
                Number(slotDurationInMinutes),
                "minutes"
              );
            }
          }

          return buildApiResponse(true, "slots for service", slots);
        },
        {
          detail: { tags: ["appointment"] },
        }
      )
      .post(
        "/",
        async ({ account, body }) => {
          if (!account) {
            return buildApiResponse(false, "unauthorized");
          }
          const { serviceId, startTime } = body;

          const service = await prisma.service.findFirst({
            where: {
              id: serviceId,
            },
          });

          if (!service) {
            return buildApiResponse(false, "service does not exist.");
          }

          const endTime = dayjs(startTime).add(service.duration, "minutes");

          const appointmentsByService = await prisma.appointment.findMany({
            where: {
              service: { businessId: service.businessId },
            },
            include: {
              service: true,
            },
          });

          const conflictingAppointments = appointmentsByService.filter(
            (appt) => {
              return (
                ((dayjs(startTime).isAfter(appt.startTime) ||
                  dayjs(startTime).isSame(appt.startTime)) &&
                  dayjs(startTime).isBefore(appt.endTime)) ||
                dayjs(startTime).isSame(appt.endTime) ||
                ((dayjs(endTime).isAfter(appt.startTime) ||
                  dayjs(endTime).isSame(appt.startTime)) &&
                  (dayjs(endTime).isBefore(appt.endTime) ||
                    dayjs(endTime).isSame(appt.startTime)))
              );
            }
          );

          if (conflictingAppointments && conflictingAppointments.length > 0) {
            return buildApiResponse(
              false,
              "found conflicting appointments on same service"
            );
          }

          const appt = await prisma.appointment.create({
            data: {
              accountId: account.id,
              serviceId,
              startTime: dayjs(startTime).toDate(),
              endTime: dayjs(endTime).toDate(),
            },
          });

          return buildApiResponse(
            true,
            "appointment created successfully.",
            appt
          );
        },
        {
          body: createAppointmentType,
          detail: { tags: ["appointment"] },
        }
      )
      .patch("/:id", async ({ account, body, params }) => {}, {
        detail: { tags: ["appointment"] },
      })
      .delete("/:id", async ({ account, params }) => {}, {
        detail: { tags: ["appointment"] },
      })
  );
