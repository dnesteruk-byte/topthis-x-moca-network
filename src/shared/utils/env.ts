import { env } from "$env/dynamic/public";

export const isDevEnv = () => env.PUBLIC_ENV === "dev";
export const isProdEnv = () => env.PUBLIC_ENV === "prod";
