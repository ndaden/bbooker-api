export enum PRISMA_ERROR {
    UNIQUE_CONSTRAINT = "P2002",
    MALFORMED_OBJECTID = "P2023",
    OBJECT_NOT_FOUND = "P2025",
    RELATION_VIOLATION = "P2014"
}

export const getErrorMessage = (prismaErrorCode: string) => {
    switch (prismaErrorCode) {
        case PRISMA_ERROR.UNIQUE_CONSTRAINT:
            return "Email already in use";
        case PRISMA_ERROR.MALFORMED_OBJECTID || PRISMA_ERROR.OBJECT_NOT_FOUND:
            return "Cannot find object";
        default:
            return "Internal server error";
    }
}
