export const generatePrompt = ({ city, services, openingClosingDaysAndTimes }: { city: string, services: string, openingClosingDaysAndTimes: string }) => {
    return `mon entreprise basée à ${city} fournit les services suivants: ${services}. ouverture ${openingClosingDaysAndTimes}.`;
}