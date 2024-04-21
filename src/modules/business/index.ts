import { Elysia } from "elysia";
import { isAuthenticated } from "../../middlewares/authentication";
import { businessBodyType, businessUpdateBodyType } from "./types";
import { prisma } from "../../libs/prisma";
import { buildApiResponse } from "../../utils/api";
import { uploadImageToFirebase } from "../../utils/upload";


export const business = (app: Elysia) => app.group('/business', (app) =>
    app.get('/', async () => {
        return buildApiResponse(true, "", await prisma.business.findMany({ include: { services: true } }))
    }, { detail: { tags: ['business'] } })
        .get('/:id', async ({ params }) => {
            const { id } = params
            return buildApiResponse(
                true,
                "",
                await prisma.business.findFirst({ where: { id: id }, include: { services: true } }))
        }, { detail: { tags: ['business'] } })
        .use(isAuthenticated)
        .post('/', async ({ body, set, account }) => {
            if (!account) {
                return buildApiResponse(false, "Unauthorized")
            }

            const { name, description, services } = body

            // Create business with its services
            const businessCreated = await prisma.business.create({
                data: {
                    name,
                    description,
                    accountId: account.id,
                    services: { createMany: { data: services } }
                }
            })

            return buildApiResponse(true, "business and services created.", businessCreated)

        }, { body: businessBodyType, detail: { tags: ['business'] } })
        .patch('/:id', async ({ params, set, body }) => {
            const { id } = params
            const { name, description, image, services } = body
            let imageUrl = 'dummy url'

            if (image) {
                // upload profile image and get url
                const uploadResult = await uploadImageToFirebase(image)

                if(!uploadResult.success) {
                    set.status = "Bad Request"
                    return buildApiResponse(false, uploadResult.error ?? '')
                }

                imageUrl = uploadResult.url ?? ''
            }

            const updatedBusiness = await prisma.business.update({
                where: {
                    id: id
                }, data: {
                    name, description, image: imageUrl,
                    services: services && { createMany: { data: services } },
                    updateDate: new Date()
                }
            })
            return buildApiResponse(true, "business updated", updatedBusiness)

        }, { body: businessUpdateBodyType, detail: { tags: ['business'] } })
        .delete('/:id', async ({ params }) => {
            const { id } = params

            await prisma.service.deleteMany({
                where: {
                    businessId: id
                }
            })
            await prisma.business.delete({
                where: {
                    id: id
                },
                select: {
                    id: true,
                    createDate: false
                }
            })
            // must also delete image from firebase

            return buildApiResponse(true, "deleted successfully.")
        }, { detail: { tags: ['business'] } }))