export interface ApiResponse {
    success: boolean
    message: string
    payload?: any
}

export const buildApiResponse = (success: boolean, message: string, payload?: any) : ApiResponse => ({ success, message, payload }) 

