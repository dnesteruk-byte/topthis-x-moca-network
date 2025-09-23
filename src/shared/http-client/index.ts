import { env } from "$env/dynamic/public";
import axios from "axios";

export const httpClient = axios.create({
	baseURL: env.PUBLIC_API_URL,
});
