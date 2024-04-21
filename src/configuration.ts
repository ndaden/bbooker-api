import { SwaggerUIOptions } from "@elysiajs/swagger/dist/swagger/types"

const swaggerConfig = {
    documentation: { 
        info: { 
            title: 'BBooker API', 
            version: "0.0.1", 
            description: "This is the official Beauty Booker API."
        }, 
        tags: [
            { name: 'app', description: 'General endpoints', label: "General" },
            { name: 'auth', description: 'Authentication endpoints' },
            { name: 'business', description: 'Business endpoints' },
            { name: 'service', description: 'Service endpoints' },
            { name: 'appointment', description: 'Appointment endpoints' }
          ]
    },
    provider: "swagger-ui",
}

export { swaggerConfig }